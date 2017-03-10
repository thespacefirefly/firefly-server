const Worker = require('firefly-core-libs').Worker;

const monet = require('monet');
const fetch = require('node-fetch');


class ServicesChecker extends Worker {

  constructor({id, delay, dbCli}) {
    super({id, delay, data:null})
    this.db = dbCli
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
                console.log(`😡 something wrong with ${keyService} | null or undefined value`) 
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
                    console.log(`😡 ${service.url} can't be reached | ${error.message}`)
                    // delete service
                    this.db.del(`${service.name}:${service.id}`)
                      .then(serviceMaybe => {
                        console.log(`${service.name}:${service.id} deleted`)
                      })
                      .catch(error => {
                        console.log(`😡 something wrong when delete $${service.name}:${service.id}`)
                      })
                  })
              }
            )
          })
          .catch(error => {
            console.log(`😡 something wrong with ${keyService} | ${error.message}`)
          })

      }) // end of forEach


    }) // end of this.db.keys().then( ...

  } // end of check()

}

module.exports = ServicesChecker
