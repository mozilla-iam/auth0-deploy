const _ = require("lodash");
const eventObj = require("./modules/event.json");
const {
  onExecutePreUserRegistration,
} = require("../actions/denyRegistration.js");

beforeEach(() => {
  _event = _.cloneDeep(eventObj);
  api = {
    access: {
      deny: jest.fn(),
    },
  };
});

test("Should not deny registration an app we haven't specified", async () => {
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).not.toHaveBeenCalled();
});

test("Should deny registration for Matrix", async () => {
  _event.connection.name = "email";
  _event.client.client_id = "pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F";
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).toHaveBeenCalled();
});
