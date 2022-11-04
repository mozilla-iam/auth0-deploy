function configurationDumper(user, context, callback) {
  const _config = JSON.stringify(configuration, Object.keys(configuration).sort(), 2);
  const _context = JSON.stringify(context, null, 2);
  const _user = JSON.stringify(user, null, 2);
  const _version = process.version;

  console.log(`
Configuration Dump:
${_config}

Context Dump:

${_context}

User Dump:
${_user}

Node Version:
${_version}
`);

  return callback(null, user, context);
}
