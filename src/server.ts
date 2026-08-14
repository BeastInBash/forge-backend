import { createServer } from 'http'
import { createApplication } from './app/app'
import { env } from './lib/env'
const main = () => {
    const server = createServer(createApplication())
    server.listen(env.PORT, () => {
        console.log("Server is Listening On Port", env.PORT)
    })
}
main()
