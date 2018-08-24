var constants = require('./constants');
var Preconditions = require('../../util/preconditions');
var BufferWriter = require('../../encoding/bufferwriter');
var BufferReader = require('../../encoding/bufferreader');
var AbstractPayload = require('./abstractpayload');
var utils = require('../../util/js');

var isUnsignedInteger = utils.isUnsignedInteger;
var isHexString = utils.isHexaString;

var CURRENT_PAYLOAD_VERSION = 1;
var HASH_SIZE = constants.SHA256_HASH_SIZE;

/**
 * @typedef {Object} TransitionPayloadJSON
 * @property {Number} version
 * @property {string} regTxId
 * @property {string} hashPrevSubTx
 * @property {Number} creditFee
 * @property {string} hashSTPacket
 * @property {string} [vchSig]
 */

/**
 * @class SubTxTransitionPayload
 * @property {number} version
 * @property {string} regTxId
 * @property {string} hashPrevSubTx
 * @property {number} creditFee
 * @property {string} hashSTPacket
 * @property {string} [vchSig]
 */
function SubTxTransitionPayload() {
  AbstractPayload.call(this);
  this.version = CURRENT_PAYLOAD_VERSION;
  this.vchSig = constants.EMPTY_SIGNATURE;
}

SubTxTransitionPayload.prototype = Object.create(AbstractPayload.prototype);
SubTxTransitionPayload.prototype.constructor = AbstractPayload;

/* Static methods */

/**
 * Serialize transition payload
 * @param {TransitionPayloadJSON} transitionPayload
 * @return {Buffer} serialized payload
 */
SubTxTransitionPayload.serializeJSONToBuffer = function (transitionPayload) {
  var payloadBufferWriter = new BufferWriter();

  // TODO: credit fee size
  payloadBufferWriter
    .writeUInt16LE(transitionPayload.version)
    .write(Buffer.from(transitionPayload.regTxId, 'hex'))
    .write(Buffer.from(transitionPayload.hashPrevSubTx, 'hex'))
    .writeUInt32LE(transitionPayload.creditFee)
    .write(Buffer.from(transitionPayload.hashSTPacket, 'hex'))
    .write(Buffer.from(transitionPayload.vchSig, 'hex'));

  return payloadBufferWriter.toBuffer();
};

/**
 * Parse raw transition payload
 * @param {Buffer} rawPayload
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.fromBuffer = function (rawPayload) {
  var payloadBufferReader = new BufferReader(rawPayload);
  var payload = new SubTxTransitionPayload();
  payload.version = payloadBufferReader.readUInt16LE();
  payload.setRegTxId(payloadBufferReader.read(HASH_SIZE).toString('hex'))
    .setHashPrevSubTx(payloadBufferReader.read(HASH_SIZE).toString('hex'))
    .setCreditFee(payloadBufferReader.readUInt32LE())
    .setHashSTPacket(payloadBufferReader.read(HASH_SIZE).toString('hex'));

  payload.vchSig = payloadBufferReader.read(constants.COMPACT_SIGNATURE_SIZE).toString('hex');

  SubTxTransitionPayload.validatePayloadJSON(payload.toJSON());
  return payload;
};

/**
 * Create new instance of payload from JSON
 * @param {string|TransitionPayloadJSON} payloadJson
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.fromJSON = function fromJSON(payloadJson) {
  var payload = new SubTxTransitionPayload();
  payload.version = payloadJson.version;
  payload
    .setHashSTPacket(payloadJson.hashSTPacket)
    .setCreditFee(payloadJson.creditFee)
    .setRegTxId(payloadJson.regTxId)
    .setHashPrevSubTx(payloadJson.hashPrevSubTx);
  payload.vchSig = payloadJson.vchSig || constants.EMPTY_SIGNATURE;

  SubTxTransitionPayload.validatePayloadJSON(payload.toJSON());
  return payload;
};

/**
 * Validate payload
 * @param {TransitionPayloadJSON} blockchainUserPayload
 * @return {boolean}
 */
SubTxTransitionPayload.validatePayloadJSON = function (blockchainUserPayload) {
  if (!blockchainUserPayload) {
    throw new Error('No Payload specified');
  }

  Preconditions.checkArgumentType(blockchainUserPayload.version, 'number', 'version');
  Preconditions.checkArgumentType(blockchainUserPayload.creditFee, 'number', 'creditFee');

  Preconditions.checkArgument(isUnsignedInteger(blockchainUserPayload.version), 'Expect version to be an unsigned integer');
  Preconditions.checkArgument(isUnsignedInteger(blockchainUserPayload.creditFee), 'Expect creditFee to be an unsigned integer');

  Preconditions.checkArgument(isHexString(blockchainUserPayload.regTxId), 'expect regTxId to be a hex string but got ' + typeof blockchainUserPayload.regTxId);
  Preconditions.checkArgument(blockchainUserPayload.regTxId.length === constants.SHA256_HASH_SIZE * 2, 'Invalid regTxId size');

  Preconditions.checkArgument(isHexString(blockchainUserPayload.hashPrevSubTx), 'expect hashPrevSubTx to be a hex string but got ' + typeof blockchainUserPayload.hashPrevSubTx);
  Preconditions.checkArgument(blockchainUserPayload.hashPrevSubTx.length === constants.SHA256_HASH_SIZE * 2, 'Invalid hashPrevSubTx size');

  Preconditions.checkArgument(isHexString(blockchainUserPayload.hashSTPacket), 'expect hashSTPacket to be a hex string but got ' + typeof blockchainUserPayload.hashSTPacket);
  Preconditions.checkArgument(blockchainUserPayload.hashSTPacket.length === constants.SHA256_HASH_SIZE * 2, 'Invalid hashSTPacket size');


  var isEmptySignature = blockchainUserPayload.vchSig === constants.EMPTY_SIGNATURE;
  Preconditions.checkArgument(isHexString(blockchainUserPayload.vchSig), 'expect vchSig to be a hex string but got ' + typeof blockchainUserPayload.vchSig);
  Preconditions.checkArgument(blockchainUserPayload.vchSig.length === constants.COMPACT_SIGNATURE_SIZE * 2 || isEmptySignature, 'Invalid vchSig size');
};

/* Instance methods */

/**
 * Validates payload data
 * @return {boolean}
 */
SubTxTransitionPayload.prototype.validate = function() {
  return SubTxTransitionPayload.validatePayloadJSON(this.toJSON());
};

/**
 * @param {string} regTxId - Hex string
 */
SubTxTransitionPayload.prototype.setRegTxId = function(regTxId) {
  this.regTxId = regTxId;
  return this;
};

/**
 * @param {string} hashPrevSubTx - Hex string
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.prototype.setHashPrevSubTx = function(hashPrevSubTx) {
  this.hashPrevSubTx = hashPrevSubTx;
  return this;
};

/**
 * @param {string} hashSTPacket - Hex string
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.prototype.setHashSTPacket = function(hashSTPacket) {
  this.hashSTPacket = hashSTPacket;
  return this;
};

/**
 * @param {number} creditFee
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.prototype.setCreditFee = function(creditFee) {
  this.creditFee = creditFee;
  return this;
};

/**
 * Serializes payload to JSON
 * @param [options]
 * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
 * @return {TransitionPayloadJSON}
 */
SubTxTransitionPayload.prototype.toJSON = function toJSON(options) {
  var skipSignature = options && options.skipSignature;
  var payloadJSON = {
    version: this.version,
    regTxId: this.regTxId,
    hashPrevSubTx: this.hashPrevSubTx,
    creditFee: this.creditFee,
    hashSTPacket: this.hashSTPacket,
    vchSig: skipSignature ? constants.EMPTY_SIGNATURE : this.vchSig
  };
  SubTxTransitionPayload.validatePayloadJSON(payloadJSON);
  return payloadJSON;
};

/**
 * Serialize payload to buffer
 * @param [options]
 * @param {boolean} options.skipSignature - skip signature part. Needed for creating new signature
 * @return {Buffer}
 */
SubTxTransitionPayload.prototype.toBuffer = function toBuffer(options) {
  return SubTxTransitionPayload.serializeJSONToBuffer(this.toJSON(options));
};

/**
 * Copy payload instance
 * @return {SubTxTransitionPayload}
 */
SubTxTransitionPayload.prototype.copy = function copy() {
  return SubTxTransitionPayload.fromJSON(this.toJSON());
};

module.exports = SubTxTransitionPayload;