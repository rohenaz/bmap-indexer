import express from 'express';
import { JungleBusClient } from '@gorillapool/js-junglebus';
import chalk from 'chalk';
import { crawler, setCurrentBlock, processTransaction } from './crawler.js';
import { closeDb, getDbo } from './db.js';
import { ensureEnvVars } from './env.js';
import { getCurrentBlock } from './state.js';
import cors from 'cors';

const app = express();

// Add body-parser middleware to parse JSON request body
app.use(express.json());
app.use('/ingest', cors());

const start = async () => {
  // Start the web server and listen on the assigned port
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  await ensureEnvVars();
  await getDbo(); // warm up db connection
  console.log('WARM');
  try {
    // Should really start with latest blk from ANY collection, not only video like this
    let currentBlock = await getCurrentBlock();
    setCurrentBlock(currentBlock);
    console.log(chalk.cyan('crawling from', currentBlock));

    const s = 'junglebus.gorillapool.io';
    console.log('CRAWLING', s);
    const jungleBusClient = new JungleBusClient(s, {
      debug: true,
      protocol: 'protobuf',
      onConnected(ctx) {
        // add your own code here
        console.log({ status: 'connected', ctx });
      },
      onConnecting(ctx) {
        // add your own code here
        console.log({ status: 'connecting', ctx });
      },
      onDisconnected(ctx) {
        // add your own code here
        console.log({ status: 'disconnected', ctx });
      },
      onError(ctx) {
        // add your own code here
        console.log({ status: 'error', ctx });
      },
    });

    await crawler(jungleBusClient);
  } catch (e) {
    console.error(e);
  }
};

// Define the /ingest endpoint
app.post('/ingest', function (req, res) {
  // ingest a raw tx
  console.log('ingest', req.body.rawTx);

  if (req.body.rawTx) {
    processTransaction({
      transaction: req.body.rawTx,
    })
      .then((tx) => {
        res.status(201).send(tx);
      })
      .catch((e) => res.status(500).send(e));

    return;
  } else {
    return res.status(400).send();
  }
});

process.on('SIGINT', async function () {
  // graceful shutdown
  console.log('close from shutdown');
  await closeDb();
  // server.close();
  process.exit();
});

console.log(
  chalk.yellow(`
:::::::::  ::::    ::::      :::     :::::::::  
  :+:    :+: +:+:+: :+:+:+   :+: :+:   :+:    :+: 
  +:+    +:+ +:+ +:+:+ +:+  +:+   +:+  +:+    +:+ 
  +#++:++#+  +#+  +:+  +#+ +#++:++#++: +#++:++#+  
  +#+    +#+ +#+       +#+ +#+     +#+ +#+        
  #+#    #+# #+#       #+# #+#     #+# #+#        
  #########  ###       ### ###     ### ###
`)
);

setTimeout(start, 1000);