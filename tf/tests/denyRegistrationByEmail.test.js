const auth0 = require("auth0");
const _ = require("lodash");
const eventObj = require("./modules/event.json");
const { emailUser, ldapUser } = require("./modules/users.js");
const {
  onExecutePreUserRegistration,
} = require("../actions/denyRegistrationByEmail.js");

beforeEach(() => {
  _event = _.cloneDeep(eventObj);
  _event.secrets = {
    mgmtClientId: "fake",
    mgmtClientSecrets: "fake",
  };
  _emailUser = _.cloneDeep(emailUser);

  api = {
    access: {
      deny: jest.fn(),
    },
  };

  mockManagementClient = {
    usersByEmail: {
      getByEmail: jest.fn(),
    },
  };

  auth0.ManagementClient = jest.fn(() => mockManagementClient);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("Should not deny registration an app we haven't specified", async () => {
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).not.toHaveBeenCalled();
});

test("Should deny a new registration for Matrix", async () => {
  _event.connection.name = "email";
  _event.client.client_id = "pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F";
  mockManagementClient.usersByEmail.getByEmail.mockReturnValue(
    Promise.resolve({ data: [] })
  );
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).toHaveBeenCalled();
});

test("Should allow an email login for Matrix", async () => {
  _event.connection.name = "email";
  _event.client.client_id = "pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F";
  mockManagementClient.usersByEmail.getByEmail
    .mockReturnValueOnce(Promise.resolve({ data: [_emailUser] }))
    .mockReturnValueOnce(Promise.resolve({ data: [] }));
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).not.toHaveBeenCalled();
});

test("Should deny an email login for Matrix in the face of an exception", async () => {
  _event.connection.name = "email";
  _event.client.client_id = "pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F";
  mockManagementClient.usersByEmail.getByEmail.mockImplementation(async () => {
    throw new Error("test");
  });
  await onExecutePreUserRegistration(_event, api);
  expect(api.access.deny).toHaveBeenCalled();
});
