"use strict";

import { Gateway, Wallets } from "fabric-network";
import FabricCAServices from "fabric-ca-client";
import path from "path";
import {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
} from "../test-application/javascript/CAUtil.js";
import {
  buildCCPOrg1,
  buildWallet,
} from "../test-application/javascript/AppUtil.js";
import { fileURLToPath } from "url";

const channelName = process.env.CHANNEL_NAME || "mychannel";
const chaincodeName = process.env.CHAINCODE_NAME || "basic";

function prettyJSONString(inputString) {
  return JSON.stringify(JSON.parse(inputString), null, 2);
}

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// const channelName = envOrDefault("CHANNEL_NAME", "mychannel");
// const chaincodeName = envOrDefault("CHAINCODE_NAME", "basic");
const mspId = envOrDefault("MSP_ID", "Org1MSP");

const mspOrg1 = "Org1MSP";
const walletPath = path.join(__dirname, "wallet");
const org1UserId = "javascriptAppUser";

// Path to crypto materials.
const cryptoPath = envOrDefault(
  "CRYPTO_PATH",
  path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "test-network",
    "organizations",
    "peerOrganizations",
    "org1.example.com"
  )
);

// Path to user private key directory.
const keyDirectoryPath = envOrDefault(
  "KEY_DIRECTORY_PATH",
  path.resolve(cryptoPath, "users", "User1@org1.example.com", "msp", "keystore")
);

// Path to user certificate.
const certPath = envOrDefault(
  "CERT_PATH",
  path.resolve(
    cryptoPath,
    "users",
    "User1@org1.example.com",
    "msp",
    "signcerts",
    "cert.pem"
  )
);

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
  "TLS_CERT_PATH",
  path.resolve(cryptoPath, "peers", "peer0.org1.example.com", "tls", "ca.crt")
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault("PEER_ENDPOINT", "localhost:7051");

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault("PEER_HOST_ALIAS", "peer0.org1.example.com");

const utf8Decoder = new TextDecoder();
const assetId = `asset${Date.now()}`;
import express from "express";
import cors from "cors";

const port = 3001;
const app = express();

app.use(cors());

app.get("/ack", function (req, res, next) {
  res.json({ msg: "hi Mom!" });
});

app.get("/info", async function (req, res, next) {
  const ccp = buildCCPOrg1();
  const caClient = buildCAClient(FabricCAServices, ccp, "ca.org1.example.com");
  const wallet = await buildWallet(Wallets, walletPath);

  // in a real application this would be done on an administrative flow, and only once
  await enrollAdmin(caClient, wallet, mspOrg1);

  // in a real application this would be done only when a new user was required to be added
  // and would be part of an administrative flow
  await registerAndEnrollUser(
    caClient,
    wallet,
    mspOrg1,
    org1UserId,
    "org1.department1"
  );

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: org1UserId,
    discovery: { enabled: true, asLocalhost: true }, // using asLocalhost as this gateway is using a fabric network deployed locally
  });

  // Build a network instance based on the channel where the smart contract is deployed
  const network = await gateway.getNetwork(channelName);

  // Get the contract from the network.
  const contract = network.getContract(chaincodeName);
  console.log(contract);
  console.log(network);
  console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');

      console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			let result = await contract.evaluateTransaction('GetAllAssets');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

      console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
			result = await contract.submitTransaction('CreateAsset', 'asset313', 'yellow', '5', 'Tom', '1300');
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}

  res.status(200).end();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function envOrDefault(key, defaultValue) {
  return process.env[key] || defaultValue;
}
