const fastify = require('fastify')({ logger: true })
const fastifyRateLimit = require('fastify-rate-limit');

fastify.register(fastifyRateLimit, {
    max: 5,
    timeWindow: '10 seconds'
});

fastify.post('/echo', (request) => {
  return request.body;
})

const start = async () => {
  try {
    await fastify.listen(3000)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()