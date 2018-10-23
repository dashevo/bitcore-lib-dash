var utils = require('../../util/js');
var constants = require('./constants');
var Preconditions = require('../../util/preconditions');
var BufferWriter = require('../../encoding/bufferwriter');
var BufferReader = require('../../encoding/bufferreader');
var AbstractPayload = require('./abstractpayload');
var Script = require('../../script');

var CURRENT_PAYLOAD_VERSION = 1;

/**
* @typedef {Object} CommitmentTxPayloadJSON
* @property {number} version	uint16_t	2	Version of the final commitment message
* @property {string} quorumHash	uint256	32	The quorum identifier
* @property {number} signersSize	compactSize uint	1-9	Bit size of the signers bitvector
* @property {string} signers	byte[]	(bitSize + 7) / 8	Bitset representing the aggregated signers of this final commitment
* @property {number} validMembersSize	compactSize uint	1-9	Bit size of the validMembers bitvector
* @property {string} validMembers	byte[]	(bitSize + 7) / 8	Bitset of valid members in this commitment
* @property {string} quorumPublicKey	BLSPubKey	64	The quorum public key
* @property {string} quorumVvecHash	uint256	32	The hash of the quorum verification vector
* @property {string} quorumSig	BLSSig	32	Recovered threshold signature
* @property {string} sig	BLSSig	32	Aggregated BLS signatures from all included commitments
*/

/**
* @class CommitmentTxPayload
* @property {number} version	
* @property {number} quorumHash	
* @property {number} signersSize	
* @property {number} signers	
* @property {number} validMembersSize	
* @property {number} validMembers	
* @property {number} quorumPublicKey	
* @property {number} quorumVvecHash	
* @property {number} quorumSig	
* @property {number} sig
*/

function ProRegTxPayload(options) {
  AbstractPayload.call(this);
  this.version = CURRENT_PAYLOAD_VERSION;

  if (options) {
    this.quorumHash = options.quorumHash;
    this.signersSize = options.signersSize;
    this.validMembersSize = options.validMembersSize;
    this.keyIdOwner = options.keyIdOwner;
    this.keyIdOperator = options.keyIdOperator;
    this.keyIdVoting = options.keyIdVoting;
    this.operatorReward = options.operatorReward;
    this.scriptPayout = options.scriptPayout;
    this.inputsHash = options.inputsHash;
    this.payloadSig = options.payloadSig;
    this.protocolVersion = options.protocolVersion;
  }
}

ProRegTxPayload.prototype = Object.create(AbstractPayload.prototype);
ProRegTxPayload.prototype.constructor = AbstractPayload;

/* Static methods */

/**
 * Parse raw payload
 * @param {Buffer} rawPayload
 * @return {ProRegTxPayload}
 */
ProRegTxPayload.fromBuffer = function fromBuffer(rawPayload) {
  var payloadBufferReader = new BufferReader(rawPayload);
  var payload = new ProRegTxPayload();

  payload.version = payloadBufferReader.readUInt16LE();
  payload.protocolVersion = payloadBufferReader.readInt32LE();
  payload.collateralIndex = payloadBufferReader.readUInt32LE();
  payload.ipAddress = payloadBufferReader.read(16).toString('hex');
  payload.port = payloadBufferReader.readUInt16BE();

  // TODO: not sure about a byte order
  payload.keyIdOwner = payloadBufferReader.read(constants.PUBKEY_ID_SIZE).toString('hex');
  payload.keyIdOperator = payloadBufferReader.read(constants.PUBKEY_ID_SIZE).toString('hex');
  payload.keyIdVoting = payloadBufferReader.read(constants.PUBKEY_ID_SIZE).toString('hex');

  var scriptPayoutSize = payloadBufferReader.readVarintNum();
  payload.scriptPayout = payloadBufferReader.read(scriptPayoutSize).toString('hex');

  payload.operatorReward = payloadBufferReader.readUInt16LE();
  payload.inputsHash = payloadBufferReader.read(constants.SHA256_HASH_SIZE).toString('hex');

  var payloadSigSize = payloadBufferReader.readVarintNum();

  if (payloadSigSize > 0) {
    payload.payloadSig = payloadBufferReader.read(payloadSigSize).toString('hex');
  }

  if (!payloadBufferReader.finished()) {
    throw new Error('Failed to parse payload: raw payload is bigger than expected.');
  }

  return payload;
};

/**
 * Create new instance of payload from JSON
 * @param {string|ProRegTxPayloadJSON} payloadJson
 * @return {ProRegTxPayload}
 */
ProRegTxPayload.fromJSON = function fromJSON(payloadJson) {
  var payload = new ProRegTxPayload(payloadJson);
  payload.validate();
  return payload;
};

/* Instance methods */

/**
 * Validate payload
 * @return {boolean}
 */
ProRegTxPayload.prototype.validate = function () {
  Preconditions.checkArgument(utils.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
  Preconditions.checkArgument(utils.isUnsignedInteger(this.protocolVersion), 'Expect protocolVersion to be an unsigned integer');
  Preconditions.checkArgument(utils.isUnsignedInteger(this.collateralIndex), 'Expect collateralIndex to be an unsigned integer');

  Preconditions.checkArgument(this.ipAddress, 'string', 'Expect ipAddress to be a string');
  Preconditions.checkArgument(this.ipAddress.length === constants.IP_ADDRESS_SIZE * 2, 'Expect ipAddress to be a hex string representing an ipv6 address');

  Preconditions.checkArgument(utils.isUnsignedInteger(this.port), 'Expect port to be an unsigned integer');

  Preconditions.checkArgument(utils.isHexaString(this.keyIdOwner), 'Expect keyIdOwner to be a hex string');
  Preconditions.checkArgument(utils.isHexaString(this.keyIdOperator), 'Expect keyIdOperator to be a hex string');
  Preconditions.checkArgument(utils.isHexaString(this.keyIdVoting), 'Expect keyIdVoting to be a hex string');
  Preconditions.checkArgument(this.keyIdOwner.length === constants.PUBKEY_ID_SIZE * 2, 'Expect keyIdOwner to be 20 bytes in size ');
  Preconditions.checkArgument(this.keyIdOperator.length === constants.PUBKEY_ID_SIZE * 2, 'Expect keyIdOwner to be 20 bytes in size ');
  Preconditions.checkArgument(this.keyIdVoting.length === constants.PUBKEY_ID_SIZE * 2, 'Expect keyIdOwner to be 20 bytes in size ');

  Preconditions.checkArgument(utils.isUnsignedInteger(this.operatorReward), 'Expect operatorReward to be an unsigned integer');
  Preconditions.checkArgument(this.operatorReward < 10000, 'Expect operatorReward to be lesser than 10000');

  Preconditions.checkArgument(utils.isHexaString(this.inputsHash), 'Expect inputsHash to be a hex string');

  if (this.scriptPayout) {
    var script = new Script(this.scriptPayout);
    Preconditions.checkArgument(script.isPublicKeyHashOut() || script.isScriptHashOut(), 'Expected scriptOperatorPayout to be a p2pkh/p2sh');
  }

  if (Boolean(this.payloadSig)) {
    Preconditions.checkArgument(utils.isHexaString(this.payloadSig), 'Expect payload sig to be a hex string');
  }
};

/**
 * Serializes payload to JSON
 * @param [options]
 * @param [options.skipSignature]
 * @return {ProRegTxPayloadJSON}
 */
ProRegTxPayload.prototype.toJSON = function toJSON(options) {
  var noSignature = !Boolean(this.payloadSig);
  var skipSignature = noSignature || (options && options.skipSignature);
  this.validate();
  var payloadJSON = {
    version: this.version,
    protocolVersion: this.protocolVersion,
    collateralIndex: this.collateralIndex,
    ipAddress: this.ipAddress,
    port: this.port,
    keyIdOwner: this.keyIdOwner,
    keyIdOperator: this.keyIdOperator,
    keyIdVoting: this.keyIdVoting,
    operatorReward: this.operatorReward,
    scriptPayout: this.scriptPayout,
    inputsHash: this.inputsHash
  };
  if (!skipSignature) {
    payloadJSON.payloadSig = this.payloadSig;
  }
  return payloadJSON;
};

/**
 * Serialize payload to buffer
 * @param [options]
 * @param {Boolean} [options.skipSignature] - skip signature. Needed for signing
 * @return {Buffer}
 */
ProRegTxPayload.prototype.toBuffer = function toBuffer(options) {
  var noSignature = !Boolean(this.payloadSig);
  var skipSignature = noSignature || (options && options.skipSignature);
  this.validate();

  var payloadBufferWriter = new BufferWriter();

  payloadBufferWriter
    .writeUInt16LE(this.version)
    .writeUInt32LE(this.protocolVersion)
    .writeInt32LE(this.collateralIndex)
    .write(Buffer.from(this.ipAddress, 'hex'))
    .writeUInt16BE(this.port)
    .write(Buffer.from(this.keyIdOwner, 'hex'))
    .write(Buffer.from(this.keyIdOperator, 'hex'))
    .write(Buffer.from(this.keyIdVoting, 'hex'))
    .writeVarintNum(Buffer.from(this.scriptPayout, 'hex').length)
    .write(Buffer.from(this.scriptPayout, 'hex'))
    .writeUInt16LE(this.operatorReward)
    .write(Buffer.from(this.inputsHash, 'hex'));

  if (!skipSignature) {
    payloadBufferWriter.writeVarintNum(Buffer.from(this.payloadSig, 'hex').length);
    payloadBufferWriter.write(Buffer.from(this.payloadSig, 'hex'));
  } else {
    payloadBufferWriter.write(constants.EMPTY_SIGNATURE_SIZE);
  }

  return payloadBufferWriter.toBuffer();
};

ProRegTxPayload.prototype.copy = function copy() {
  return ProRegTxPayload.fromBuffer(this.toBuffer());
};

module.exports = ProRegTxPayload;