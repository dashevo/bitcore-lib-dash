/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

'use strict';
var _ = require('lodash');
var { PrivateKey } = require('bls-signatures');
var BufferReader = require('../encoding/bufferreader');
var BufferWriter = require('../encoding/bufferwriter');
var BufferUtil = require('../util/buffer');
var $ = require('../util/preconditions');
var Hash = require('../crypto/hash');
var constants = require('../constants');
var utils = require('../util/js');

var isSha256 = utils.isSha256HexString;
var isHexStringOfSize = utils.isHexStringOfSize;
var isHexString = utils.isHexaString;

var SHA256_HASH_SIZE = constants.SHA256_HASH_SIZE;
var BLS_PUBLIC_KEY_SIZE = constants.BLS_PUBLIC_KEY_SIZE;
var BLS_SIGNATURE_SIZE = constants.BLS_SIGNATURE_SIZE;

/**
 * @typedef {Object} SMLQuorumEntry
 * @property {number} version
 * @property {number} llmqType
 * @property {string} quorumHash
 * @property {number} signersCount
 * @property {string} signers
 * @property {number} validMembersCount
 * @property {string} validMembers
 * @property {string} quorumPublicKey
 * @property {string} quorumVvecHash
 * @property {string} quorumSig
 * @property {string} membersSig
 */

/**
 * @class QuorumEntry
 * @param {string|Object|Buffer} [arg] - A Buffer, JSON string, or Object representing a SMLQuorumEntry
 * @constructor
 * @property {number} version
 * @property {number} llmqType
 * @property {string} quorumHash
 * @property {number} signersCount
 * @property {string} signers
 * @property {number} validMembersCount
 * @property {string} validMembers
 * @property {string} quorumPublicKey
 * @property {string} quorumVvecHash
 * @property {string} quorumSig
 * @property {string} membersSig
 */
function QuorumEntry(arg) {
  if (arg) {
    if (arg instanceof QuorumEntry) {
      return arg.copy();
    } else if (BufferUtil.isBuffer(arg)) {
      return QuorumEntry.fromBuffer(arg);
    } else if (_.isObject(arg)) {
      return QuorumEntry.fromObject(arg);
    } else if (arg instanceof QuorumEntry) {
      return arg.copy();
    } else if (isHexString(arg)) {
      return QuorumEntry.fromHexString(arg);
    } else {
      throw new TypeError('Unrecognized argument for QuorumEntry');
    }
  }
}

/**
 * Parse buffer and returns QuorumEntry
 * @param {Buffer} buffer
 * @return {QuorumEntry}
 */
QuorumEntry.fromBuffer = function fromBuffer(buffer) {
  var bufferReader = new BufferReader(buffer);
  var SMLQuorumEntry = new QuorumEntry();
  SMLQuorumEntry.version = bufferReader.readUInt16LE();
  SMLQuorumEntry.llmqType = bufferReader.readUInt8();
  SMLQuorumEntry.quorumHash = bufferReader.read(constants.SHA256_HASH_SIZE).toString('hex');
  SMLQuorumEntry.signersCount = bufferReader.readVarintNum();
  var signersBytesToRead = Math.floor((SMLQuorumEntry.getSizelength() + 7) / 8) || 1;
  SMLQuorumEntry.signers = bufferReader.read(signersBytesToRead).toString('hex');
  SMLQuorumEntry.validMembersCount = bufferReader.readVarintNum();
  var validMembersBytesToRead = Math.floor((SMLQuorumEntry.getSizelength() + 7) / 8) || 1;
  SMLQuorumEntry.validMembers = bufferReader.read(validMembersBytesToRead).toString('hex');
  SMLQuorumEntry.quorumPublicKey = bufferReader.read(BLS_PUBLIC_KEY_SIZE).toString('hex');
  SMLQuorumEntry.quorumVvecHash = bufferReader.read(SHA256_HASH_SIZE).toString('hex');
  SMLQuorumEntry.quorumSig = bufferReader.read(BLS_SIGNATURE_SIZE).toString('hex');
  SMLQuorumEntry.membersSig = bufferReader.read(BLS_SIGNATURE_SIZE).toString('hex');

  return SMLQuorumEntry;
};

/**
 * @param {string} string
 * @return {QuorumEntry}
 */
QuorumEntry.fromHexString = function fromString(string) {
  return QuorumEntry.fromBuffer(Buffer.from(string, 'hex'));
};

/**
 * Serialize SML entry to buf
 * @return {Buffer}
 */
QuorumEntry.prototype.toBuffer = function toBuffer() {
  this.validate();
  var bufferWriter = new BufferWriter();

  bufferWriter.writeUInt16LE(this.version);
  bufferWriter.writeUInt8(this.llmqType);
  bufferWriter.write(Buffer.from(this.quorumHash, 'hex'));
  bufferWriter.writeVarintNum(this.signersCount);
  bufferWriter.write(Buffer.from(this.signers, 'hex'));
  bufferWriter.writeVarintNum(this.validMembersCount);
  bufferWriter.write(Buffer.from(this.validMembers, 'hex'));
  bufferWriter.write(Buffer.from(this.quorumPublicKey, 'hex'));
  bufferWriter.write(Buffer.from(this.quorumVvecHash, 'hex'));
  bufferWriter.write(Buffer.from(this.quorumSig, 'hex'));
  bufferWriter.write(Buffer.from(this.membersSig, 'hex'));

  return bufferWriter.toBuffer();
};

/**
 * Serialize quorum entry commitment to buf
 * @return {Buffer}
 */
QuorumEntry.prototype.getCommitmentHash = function getCommitmentBuffer() {
  this.validate();
  var bufferWriter = new BufferWriter();
  bufferWriter.writeUInt8(this.llmqType);
  bufferWriter.write(Buffer.from(this.quorumHash, 'hex'));
  bufferWriter.writeVarintNum(this.validMembersCount);
  bufferWriter.write(Buffer.from(this.validMembers, 'hex'));
  bufferWriter.write(Buffer.from(this.quorumPublicKey, 'hex'));
  bufferWriter.write(Buffer.from(this.quorumVvecHash, 'hex'));

  return Hash.sha256sha256(bufferWriter.toBuffer());
};

/**
 * Create SMLQuorumEntry from an object
 * @param {SMLQuorumEntry} obj
 * @return {QuorumEntry}
 */
QuorumEntry.fromObject = function fromObject(obj) {
  var SMLQuorumEntry = new QuorumEntry();
  SMLQuorumEntry.version = obj.version;
  SMLQuorumEntry.llmqType = obj.llmqType;
  SMLQuorumEntry.quorumHash = obj.quorumHash;
  SMLQuorumEntry.signersCount = obj.signersCount;
  SMLQuorumEntry.signers = obj.signers;
  SMLQuorumEntry.validMembersCount = obj.validMembersCount;
  SMLQuorumEntry.validMembers = obj.validMembers;
  SMLQuorumEntry.quorumPublicKey = obj.quorumPublicKey;
  SMLQuorumEntry.quorumVvecHash = obj.quorumVvecHash;
  SMLQuorumEntry.quorumSig = obj.quorumSig;
  SMLQuorumEntry.membersSig = obj.membersSig;

  SMLQuorumEntry.validate();
  return SMLQuorumEntry;
};

QuorumEntry.prototype.validate = function validate() {
  $.checkArgument(utils.isUnsignedInteger(this.version), 'Expect version to be an unsigned integer');
  $.checkArgument(utils.isUnsignedInteger(this.llmqType), 'Expect llmqType to be an unsigned integer');
  $.checkArgument(isSha256(this.quorumHash), 'Expected quorumHash to be a sha256 hex string');
  $.checkArgument(utils.isHexaString(this.signers), 'Expect signers to be a hex string');
  $.checkArgument(utils.isHexaString(this.validMembers), 'Expect validMembers to be a hex string');
  $.checkArgument(isHexStringOfSize(this.quorumPublicKey, BLS_PUBLIC_KEY_SIZE * 2), 'Expected quorumPublicKey to be a bls pubkey');
  $.checkArgument(isHexStringOfSize(this.quorumVvecHash, SHA256_HASH_SIZE * 2), `Expected quorumVvecHash to be a hex string of size ${SHA256_HASH_SIZE}`);
  $.checkArgument(isHexStringOfSize(this.quorumSig, BLS_SIGNATURE_SIZE * 2), 'Expected quorumSig to be a bls signature');
  $.checkArgument(isHexStringOfSize(this.membersSig, BLS_SIGNATURE_SIZE * 2), 'Expected membersSig to be a bls signature');
};

QuorumEntry.prototype.toObject = function toObject() {
  return {
    version: this.version,
    llmqType: this.llmqType,
    quorumHash: this.quorumHash,
    signersCount: this.signersCount,
    signers: this.signers,
    validMembersCount: this.validMembersCount,
    validMembers: this.validMembers,
    quorumPublicKey: this.quorumPublicKey,
    quorumVvecHash: this.quorumVvecHash,
    quorumSig: this.quorumSig,
    membersSig: this.membersSig,
  };
};

/**
 * @return {number}
 */
QuorumEntry.prototype.getQuorumThreshold = function getQuorumThreshold() {
  switch (this.llmqType) {
    case 1:
      return 30;
    case 2:
      return 240;
    case 3:
      return 340;
    case 100:
      return 2;
    case 101:
      return 6;
    default:
      throw new Error('Unknown llmq type');
  }
};

/**
 * @return {number}
 */
QuorumEntry.prototype.getSizelength = function getSizelength() {
  switch (this.llmqType) {
    case 1:
      return 50;
    case 2:
      return 400;
    case 3:
      return 400;
    case 100:
      return 3;
    case 101:
      return 10;
    default:
      throw new Error(`Unknown llmq type ${this.llmqType}`);
  }
};

/**
 * @return {number}
 */
QuorumEntry.prototype.getAllQuorumMembers = function getAllQuorumMembers(SMLMNList) {
  var modifier = LLMQUtils.buildLLMQBlockHash(llmqType, blockHash);
  var MNList = new SimplifiedMNList(SMLMNList);
  return MNList.calculateQuorum(modifier);
};


/**
 * @return {Buffer}
 */
QuorumEntry.prototype.calculateHash = function calculateHash() {
  return Hash.sha256sha256(this.toBuffer()).reverse();
};

/**
 * Gets the ordering hash for a requestId
 * @return {Buffer}
 */
QuorumEntry.prototype.getOrderingHashForRequestId = function getOrderingHashForRequestId(requestId) {
  var buf = Buffer.concat(
    [Buffer.from(this.llmqType),
      Buffer.from(this.quorumHash, 'hex'),
      Buffer.from(requestId, 'hex')]
  );
  return Hash.sha256sha256(buf);
};

/**
 * Creates a copy of QuorumEntry
 * @return {QuorumEntry}
 */
QuorumEntry.prototype.copy = function copy() {
  return QuorumEntry.fromBuffer(this.toBuffer());
};

module.exports = QuorumEntry;
