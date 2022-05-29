import axios from 'axios'
import log from 'ololog'

export async function ethereumGetCurrentBlock () {
  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.etherscan.io/api',
      headers: {
        Accept: '*/*'
      },
      params: {
        module: 'proxy',
        action: 'eth_blockNumber',
        apikey: process.env.ETHERSCAN_API_KEY
      }
    })
    return response.data.result
  } catch (error) {
    log.red(error)
  }
}
