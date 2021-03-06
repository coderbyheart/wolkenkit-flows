'use strict';

const path = require('path');

const processEnv = require('processenv'),
      tailwind = require('tailwind'),
      WolkenkitApplication = require('wolkenkit-application');

const logic = require('./appLogic'),
      repository = require('./repository');

const eventStore = require(`sparbuch/${processEnv('EVENTSTORE_TYPE')}`);

const app = tailwind.createApp({
  profiling: {
    host: processEnv('PROFILING_HOST'),
    port: processEnv('PROFILING_PORT')
  }
});

const applicationDirectory = path.join(app.dirname, 'app');
const { flows, writeModel } = new WolkenkitApplication(applicationDirectory);

app.run([
  done => {
    eventStore.initialize({
      url: app.env('EVENTSTORE_URL'),
      namespace: `${app.env('APPLICATION')}flows`
    }, done);
  },
  done => {
    repository.initialize({ app, flows, eventStore }, done);
  },
  done => {
    app.commandbus.use(new app.wires.commandbus.amqp.Sender({
      url: app.env('COMMANDBUS_URL'),
      application: app.env('APPLICATION')
    }), done);
  },
  done => {
    app.flowbus.use(new app.wires.flowbus.amqp.Receiver({
      url: app.env('FLOWBUS_URL'),
      application: app.env('APPLICATION')
    }), done);
  },
  () => {
    logic({ app, eventStore, flows, writeModel });
  }
]);
