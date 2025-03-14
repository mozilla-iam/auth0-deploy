exports.onExecutePostLogin = async (event, api) => {
  const _version = process.version;
  const _event = JSON.stringify(event, null, 2);

  console.log("Node Version:", _version);
  console.log("Event Object:");
  console.log(_event);

  return;
};
