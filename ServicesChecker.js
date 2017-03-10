const Worker = require('firefly-core-libs').Worker;

const monet = require('monet');
const Type = require('union-type')
const fetch = require('node-fetch');

const EventEmitter = require('events').EventEmitter; 

const DiscoveryError = Type({
  BadKeyService: {value: String},
  ServiceUnreachable: {value: String},
  UnableToDeleteService: {value: String},
  SomethingBadWithService: {value: String}
})

class ServicesChecker extends Worker {

  constructor({id, delay, dbCli}) {
    super({id, delay, data:null})
    this.db = dbCli
    this.eventEmitter = new EventEmitter()
  }

  on(eventName, doSomeThing) {
    this.eventEmitter.on(eventName, doSomeThing)
  }

  check(data) {
    //TODO clone database resultset to avoid "collision"

    this.db.keys().then(keysServices => {
      // call each service for health check
      keysServices.forEach(keyService => {

        this.db.get(keyService)
          .then(serviceMayBe => {
            serviceMayBe.cata(
              () => { 
                let message = `😡 something wrong with ${keyService} | null or undefined value`
                console.log(message) 
                this.eventEmitter.emit('error', DiscoveryError.BadKeyService(message))
              },
              (serviceJSONString) => { // call the service
                // TODO: add header with credential?
                // service must have a `hello` route
                console.log("serviceJSONString", serviceJSONString)
                let service = JSON.parse(serviceJSONString)
                //let service = serviceJSONString

                fetch(`${service.url}/hello`)
                  .then(data => data.json())
                  .then(data => {
                    console.log(`😺 ${service.url} is active | ${JSON.stringify(data)}`)
                  })
                  .catch(error => {
                    let message = `😡 ${service.url} can't be reached | ${error.message}`
                    console.log(message)
                    this.eventEmitter.emit('error', DiscoveryError.ServiceUnreachable(message))
                    // delete service
                    this.db.del(`${service.name}:${service.id}`)
                      .then(serviceMaybe => {
                        console.log(`${service.name}:${service.id} deleted`)
                      })
                      .catch(error => {
                        let message = `😡 something wrong when delete $${service.name}:${service.id}`
                        console.log(message)
                        this.eventEmitter.emit('error', DiscoveryError.UnableToDeleteService(message))
                      })
                  })
              }
            )
          })
          .catch(error => {
            let message = `😡 something wrong with ${keyService} | ${error.message}`
            console.log(message)
            this.eventEmitter.emit('error', DiscoveryError.SomethingBadWithService(message))
          })

      }) // end of forEach


    }) // end of this.db.keys().then( ...

  } // end of check()

}

module.exports = ServicesChecker
