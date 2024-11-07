exports.onExecutePostLogin = async (event, api) => {return};

exports.onContinuePostLogin = async (event, api) => {
  // Since we do not use the /continue endpoint let's make sure we explictly fail with an UnauthorizedError
  // otherwise it is possible to continue the session even after a postError redirect is set.
  return api.access.deny('The /continue endpoint is not allowed');
};
