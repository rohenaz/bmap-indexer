import { JungleBusClient } from '@gorillapool/js-junglebus'
import chalk from 'chalk'
import { crawler, setCurrentBlock } from './crawler.js'
import { closeDb, getDbo } from './db.js'
import { ensureEnvVars } from './env.js'
import { getCurrentBlock } from './state.js'

const start = async () => {
  await ensureEnvVars()
  await getDbo() // warm up db connection
  console.log('WARM')
  try {
    // Should really start with latest blk from ANY collection, not only video like this
    let currentBlock = await getCurrentBlock()
    setCurrentBlock(currentBlock)
    console.log(chalk.cyan('crawling from', currentBlock))

    const s = 'junglebus.gorillapool.io'
    console.log('CRAWLING', s)
    const jungleBusClient = new JungleBusClient(s, {
      debug: true,
      protocol: 'protobuf',
      onConnected(ctx) {
        // add your own code here

        console.log({ status: 'connected', ctx })
      },
      onConnecting(ctx) {
        // add your own code here

        console.log({ status: 'connecting', ctx })
      },
      onDisconnected(ctx) {
        // add your own code here
        console.log({ status: 'disconnected', ctx })
      },
      onError(ctx) {
        // add your own code here
        console.log({ status: 'error', ctx })
      },
    })

    await crawler(jungleBusClient)
  } catch (e) {
    console.error(e)
  }
}

process.on('SIGINT', async function () {
  // graceful shutdown
  console.log('close from shutdown')
  await closeDb()
  // server.close()
  process.exit()
})

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
)

setTimeout(start, 1000)
