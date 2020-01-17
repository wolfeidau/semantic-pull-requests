import { Probot } from 'probot'
import { findPrivateKey } from 'probot/lib/private-key'
import ProbotApp from '.'

let probot

const loadProbot = () => {
  console.log(`loading app_id: ${process.env.APP_ID}`)
  probot =
        probot ||
        new Probot({
          id: Number(process.env.APP_ID),
          secret: process.env.WEBHOOK_SECRET || '',
          cert: findPrivateKey() || ''
        })

  probot.load(ProbotApp)

  return probot
}

const lowerCaseKeys = (obj) =>
  Object.keys(obj).reduce(
    (accumulator, key) =>
      Object.assign(accumulator, { [key.toLocaleLowerCase()]: obj[key] }),
    {}
  )

module.exports.handler = async (event) => {
  // Otherwise let's listen handle the payload
  probot = probot || loadProbot()

  // Determine incoming webhook event type
  const headers = lowerCaseKeys(event.headers)
  const name = headers['x-github-event']
  const id = headers['x-github-delivery']

  // Convert the payload to an Object if API Gateway stringifies it
  event.body =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body

  if (event.body === null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ msg: 'missing event body' })
    }
  }

  // Do the thing
  console.log(
    `Received event ${name}${event.body.action ? '.' + event.body.action : ''}`
  )

  try {
    await probot.receive({
      id,
      name,
      payload: event.body
    })

    console.log(`RESULT: ${name}.${event.body.action}`)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Received ${name}.${event.body.action}`
      })
    }
  } catch (err) {
    console.error(err)
    return err
  }
}
