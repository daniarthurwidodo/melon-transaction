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
const chaincodeName = process.env.CHAINCODE_NAME || "melon";

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
app.use(express.json());

app.get("/ack", function (req, res, next) {
  res.json({ msg: "hi Mom!" });
});

app.post("/enroll-admin", async function (req, res, next) {
  const ccp = buildCCPOrg1();
  const caClient = buildCAClient(FabricCAServices, ccp, "ca.org1.example.com");
  const wallet = await buildWallet(Wallets, walletPath);

  await enrollAdmin(caClient, wallet, mspOrg1);
  res.status(200).send({
    status: true,
    message: {},
  });
  res.end();
});

app.post("/createWallet", async function (req, res, next) {
  const ccp = buildCCPOrg1();
  const caClient = buildCAClient(FabricCAServices, ccp, "ca.org1.example.com");
  const wallet = await buildWallet(Wallets, walletPath);

  if (req.body.userId) {
    await registerAndEnrollUser(
      caClient,
      wallet,
      mspOrg1,
      req.body.userId,
      "org1.department1"
    );

    res.status(200).send({
      status: true,
      message: req.body.userId,
    });
    res.end();
  } else {
    res.status(500).send({
      status: true,
      message: req.body.userId,
    });
    res.end();
  }
});

app.post("/create-asset", async function (req, res, next) {
  try {
    const ccp = buildCCPOrg1();
  const wallet = await buildWallet(Wallets, walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: req.body.userId,
    discovery: { enabled: true, asLocalhost: true }, // using asLocalhost as this gateway is using a fabric network deployed locally
  });
  console.log(gateway);
  const network = await gateway.getNetwork(channelName);

  const contract = network.getContract(chaincodeName);

  let result = await contract.evaluateTransaction("GetAllAssets");
  console.log(result);
  console.log(`*** Result: ${prettyJSONString(result.toString())}`)
  console.log(
    "\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments"
  );
  console.log(req.body);
  result = await contract.submitTransaction(
    "CreateAsset",
    req.body.transaksiId,
    req.body.pengirim,
    req.body.penerima,
    req.body.melon,
    req.body.tanggalTanam,
    req.body.kuantitas,
    req.body.jenisTanaman,
    req.body.harga,
    req.body.suhu,
    req.body.lamaSimpan,
    req.body.alasan,
    req.body.tanggalTransaksi,
    req.body.jenisTransaksi,
    req.body.timeline
  );
  if(result){
    res.status(200).send({
      status: true,
      message: req.body,
    });
  } else {
    res.status(500).send({
      status: true,
      message: result,
    });
  }

  console.log("*** Result: committed");
  if (`${result}` !== "") {
    console.log(`*** Result: ${prettyJSONString(result.toString())}`);
  }

  
  res.end();
  } catch (error) {
    res.status(500).send({
      status: true,
      message: error,
    });
  }
  
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function envOrDefault(key, defaultValue) {
  return process.env[key] || defaultValue;
}
