const ethSigUtil = require("eth-sig-util");
const { network } = require("hardhat");

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const Permit = [
  { name: "owner", type: "address" },
  { name: "spender", type: "address" },
  { name: "value", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];
async function getPermitTypeData(chainId, permitToken) {
  return {
    types: {
      EIP712Domain: EIP712Domain,
      Permit: Permit,
    },
    domain: {
      name: await permitToken.name(),
      version: "1",
      chainId: chainId,
      verifyingContract: await permitToken.getAddress(),
    },
    primaryType: "Permit",
  };
}

async function buildMsgForPermitToken(
  permitToken,
  user,
  executeOrder,
  amounts,
  deadline
) {
  const nonce = await permitToken
    .nonces(user)
    .then((nonce) => nonce.toString());

  return {
    owner: user,
    spender: executeOrder,
    value: amounts,
    nonce: nonce,
    deadline: deadline,
  };
}

async function signPermitData(user_privateKey, user, data) {
  // If user is a private key, use it to sign
  if (typeof user === "string") {
    const privateKey = Buffer.from(user_privateKey.replace(/^0x/, ""), "hex");
    return ethSigUtil.signTypedMessage(privateKey, { data });
  }
}

async function addTypedData(request, permitToken) {
  const chainIdHex = await network.provider.send("eth_chainId");
  const chainId = parseInt(chainIdHex);
  const typeData = await getPermitTypeData(chainId, permitToken);
  return { ...typeData, message: request };
}

async function signERC20PermitData(
  user_privateKey,
  user,
  permitToken,
  executeOrder,
  amounts,
  deadline
) {
  const request = await buildMsgForPermitToken(
    permitToken,
    user,
    executeOrder,
    amounts,
    deadline
  );
  // console.log("request", request);
  const toSignData = await addTypedData(request, permitToken);
  // console.log("toSignData", toSignData);
  const signature = await signPermitData(user_privateKey, user, toSignData);
  return { signature, request };
}

module.exports = {
  signERC20PermitData,
};
