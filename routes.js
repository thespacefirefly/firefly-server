
let routes = ({dbCli, httpPort, checkCredentials, httpApp}) => {

  return new Promise((resolve, reject) => {
    try {
      
      httpApp.get(`/services`, (req, res) => {
        dbCli.keys()
          .then(allKeys => res.send(allKeys))
          .catch(err => res.send({error: err.message}))
      });

      httpApp.get(`/services/all/details`, (req, res) => {
        
        dbCli.keys()
          .then(allKeys => {
            let promisesList = allKeys.map(key => { // key is serviceId
              return dbCli.get(key).then(serviceMayBe => {
                return serviceMayBe.cata(
                  () => {error: "service unknown"},
                  (service) => JSON.parse(service)
                )
              })
            })

            Promise.all(promisesList).then(servicesDetails => {
              res.send(servicesDetails)
              
            })
            .catch(err => res.send({error: err.message}))

          })
          .catch(err => res.send({error: err.message}))
      });

      httpApp.get(`/services/:service_id`, (req, res) => {
        serviceId = req.params.service_id
        dbCli.get(serviceId)
          .then(serviceMayBe => {
            serviceMayBe.cata(
              () => res.send({error: "service unknown"}),
              (service) => res.send(service)
            )
          })
          .catch(err => res.send({error: err.message}))
      });

      httpApp.post(`/hey`, (req, res) => {

        let serviceCredentials = req.headers["authorization"]

        console.log("req.headers", req.headers)

        console.log(`🙈 service credentials: ${serviceCredentials}`)
      
        checkCredentials(serviceCredentials).then(result => {

          console.log(`Credentials are OK 😘`)

          let serviceInformations = req.body
          let key = `${serviceInformations.name}:${serviceInformations.id}`
          console.log(`key service: ${key}`)

          console.log(`😃 service: ${serviceInformations.name}`)
          console.log(` id: ${serviceInformations.id}`)
          console.log(` version: ${serviceInformations.version}`)
          console.log(` url: ${serviceInformations.url}`)
          console.log(` operations: ${JSON.stringify(serviceInformations.operations)}`)

          // update database
          dbCli.set(key, JSON.stringify(serviceInformations))
            .then(serviceMayBe => {

              serviceMayBe.cata(
                () => {
                  res.status(505)
                  res.send(JSON.stringify({error: "something bad with service update"}))
                },
                (service) => {
                  res.status(201)
                  res.send(JSON.stringify(service))
                }
              )
              
            })
            .catch(error => {
              res.status(505)
              res.send({error: error.message})
            })
          // end update database


        }).catch(error => {
          console.log(`😈 bad credentials: ${serviceCredentials}`)
          res.status(505)
          res.send({error: "bad service credential"})
        })

      }); // end of httpApp.post(`/hey` ...

      resolve(httpApp)

    } catch(error) {
      reject(error)
    }
  })
}

module.exports = routes
