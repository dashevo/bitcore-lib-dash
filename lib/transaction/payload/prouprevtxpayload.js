var constants = require('./constants');
var Preconditions = require('../../util/preconditions');
var BufferWriter = require('../../encoding/bufferwriter');
var BufferReader = require('../../encoding/bufferreader');
var AbstractPayload = require('./abstractpayload');
var utils = require('../../util/js');
var BigNumber = require('bn.js');

var isUnsignedInteger = utils.isUnsignedInteger;
var isHexString = utils.isHexaString;

var CURRENT_PAYLOAD_VERSION = 1;
var HASH_SIZE = constants.SHA256_HASH_SIZE;

/**
 * @typedef {Object} ProUpRevTransactionPayloadJSON
 * @property {number} version
 * @property {string} proTXHash
 * @property {number} reason
 * @property {string} inputsHash
 * @property {number} payloadSigSize
 * @property {string} payloadSig
 */

/**
 * @class ProUpRevTxPayload
 * @property {number} version uint_16	2	ProUpRevTx version number. Currently set to 1.
 * @property {string} proTXHash uint256	32	The hash of the provider transaction
 * @property {number} reason uint_16	2	The reason for revoking the key.
 * @property {string} inputsHash uint256	32	Hash of all the outpoints of the transaction inputs
 * @property {number} payloadSigSize compactSize uint	1-9	Size of the Signature
 * @property {string} payloadSig vector	Variable	Signature of the hash of the ProTx fields. Signed by the Operator.
 */
function ProUpRevTxPayload(options) {
  AbstractPayload.call(this);
  this.version = CURRENT_PAYLOAD_VERSION;

  if (options) {
    this.proTXHash = options.proTXHash;
    this.reason = options.reason;
    this.inputsHash = options.inputsHash;
    this.payloadSigSize = options.payloadSigSize;
    this.payloadSig = options.payloadSig;
  }
}

ProUpRevTxPayload.prototype = Object.create(AbstractPayload.prototype);
ProUpRevTxPayload.prototype.constructor = AbstractPayload;

/* Static methods */

/**
 * Serializes ProUpRevTxPayload payload
 * @param {ProUpRevTransactionPayloadJSON} transitionPayload
 * @return {Buffer} serialized payload
 */
ProUpRevTxPayload.serializeJSONToBuffer = function (transitionPayload) {
  var payloadBufferWriter = new BufferWriter();

  payloadBufferWriter
    .writeUInt16LE(transitionPayload.version)
    .write(Buffer.from(transitionPayload.proTXHash, 'hex').reverse())
    .writeUInt16LE(transitionPayload.reason)
    .write(Buffer.from(transitionPayload.inputsHash, 'hex').reverse());

  if (transitionPayload.payloadSig) {
    var signatureBuf = Buffer.from(transitionPayload.payloadSig, 'hex');
    payloadBufferWriter.writeVarintNum(signatureBuf.length);
    payloadBufferWriter.write(signatureBuf);
  } else {
    payloadBufferWriter.writeVarintNum(constants.EMPTY_SIGNATURE_SIZE);
  }

  return payloadBufferWriter.toBuffer();
};

/**
 * Parses raw ProUpRevTxPayload payload
 * @param {Buffer} rawPayload
 * @return {ProUpRevTxPayload}
 */
ProUpRevTxPayload.fromBuffer = function (rawPayload) {
  var payloadBufferReader = new BufferReader(rawPayload);
  var payload = new ProUpRevTxPayload();
  var signatureSize = 0;
  payload.version = payloadBufferReader.readUInt16LE();
  payload.proTXHash = payloadBufferReader.read(HASH_SIZE).reverse().toString('hex');
  payload.reason = payloadBufferReader.readUInt16LE();
  payload.inputsHash = payloadBufferReader.read(HASH_SIZE).reverse().toString('hex');
  var scriptPayoutSize = payloadBufferReader.readVarintNum();
  payload.scriptPayout = payloadBufferReader.read(scriptPayoutSize).reverse().toString('hex');

  if (!payloadBufferReader.finished()) {
    signatureSize = payloadBufferReader.readVarintNum();
  }

  if (signatureSize > 0) {
    payload.payloadSig = payloadBufferReader.read(signatureSize).toString('hex');
  }

  ProUpRevTxPayload.validatePayloadJSON(payload.toJSON());
  return payload;
};

/**
 * Creates new instance of ProUpRevTxPayload payload from JSON
 * @param {string|ProUpRevTransactionPayloadJSON} payloadJson
 * @return {ProUpRevTxPayload}
 */
ProUpRevTxPayload.fromJSON = function fromJSON(payloadJson) {
  var payload = new ProUpRevTxPayload();

  payload.version = payloadJson.version;
  payload.proTXHash = payloadJson.proTXHash;
  payload.reason = payloadJson.reason;
  payload.inputsHash = payloadJson.inputsHash;

  if (payloadJson.payloadSig) {
    payload.payloadSig = payloadJson.payloadSig;
  }

  ProUpRevTxPayload.validatePayloadJSON(payload.toJSON());
  return payload;
};

/**
 * Validates ProUpRevTxPayload payload
 * @param {ProUpRevTransactionPayloadJSON} payload
 * @return {boolean}
 */
ProUpRevTxPayload.validatePayloadJSON = function (payload) {
  if (!payload) {
    throw new Error('No Payload specified');
  }

  Preconditions.checkArgumentType(payload.version, 'number', 'version');
  Preconditions.checkArgumentType(payload.proTXHash, 'string', 'proTXHash');
  Preconditions.checkArgumentType(payload.reason, 'number', 'reason');
  Preconditions.checkArgumentType(payload.inputsHash, 'string', 'inputsHash');
  Preconditions.checkArgumentType(payload.payloadSigSize, 'number', 'payloadSigSize');
  Preconditions.checkArgumentType(payload.payloadSig, 'string', 'payloadSig');

  Preconditions.checkArgument(isUnsignedInteger(payload.version), 'Expected version to be an unsigned integer');
  Preconditions.checkArgument(isUnsignedInteger(payload.reason), 'Expected reason to be an unsigned integer');

  Preconditions.checkArgument(isHexString(payload.proTXHash), 'expected proTXHash to be a hex string but got ' + typeof payload.proTXHash);
  Preconditions.checkArgument(payload.proTXHash.length === constants.SHA256_HASH_SIZE * 2, 'Invalid proTXHash size');

  Preconditions.checkArgument(isHexString(payload.inputsHash), 'expected inputsHash to be a hex string but got ' + typeof payload.inputsHash);
  Preconditions.checkArgument(payload.inputsHash.length === constants.SHA256_HASH_SIZE * 2, 'Invalid inputsHash size');

  if (payload.payloadSig) {
    Preconditions.checkArgument(isHexString(payload.payloadSig), 'expected payloadSig to be a hex string but got ' + typeof payload.payloadSig);
    Preconditions.checkArgument(payload.payloadSig.length === constants.COMPACT_SIGNATURE_SIZE * 2, 'Invalid payloadSig size');
  }
};

/* Instance methods */

/**
 * Validates ProUpRevTxPayload payload data
 * @return {boolean}
 */
ProUpRevTxPayload.prototype.validate = function() {
  return ProUpRevTxPayload.validatePayloadJSON(this.toJSON());
};

/**
 * Serializes ProUpRevTxPayload payload to JSON
 * @param [options]
 * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
 * @return {ProUpRevTransactionPayloadJSON}
 */
ProUpRevTxPayload.prototype.toJSON = function toJSON(options) {
  var skipSignature = Boolean(options && options.skipSignature) || !Boolean(this.payloadSig);
  var payloadJSON = {
    version: this.version,
    proTXHash: this.proTXHash,
    reason: this.reason,
    inputsHash: this.inputsHash,
    payloadSigSize: this.payloadSigSize,
  };
  if (!skipSignature) {
    payloadJSON.payloadSig = this.payloadSig;
  }
  ProUpRevTxPayload.validatePayloadJSON(payloadJSON);
  return payloadJSON;
};

/**
 * Serializes ProUpRevTxPayload to buffer
 * @param [options]
 * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
 * @return {Buffer}
 */
ProUpRevTxPayload.prototype.toBuffer = function toBuffer(options) {
  return ProUpRevTxPayload.serializeJSONToBuffer(this.toJSON(options));
};

/**
 * Copy payload instance
 * @return {ProUpRevTxPayload}
 */
ProUpRevTxPayload.prototype.copy = function copy() {
  return ProUpRevTxPayload.fromJSON(this.toJSON());
};

module.exports = ProUpRevTxPayload;