function (user, context, callback) {
    var escapable = /[\\\"\x00-\x1f\x7f-\uffff]/g,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };
    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c : '';
            }) + '"' :
            '"' + string + '"';
    }
    // Attributes we decide to strip unicode from
    user.name = quote(user.name);
    if (user.family_name)
        user.family_name = quote(user.family_name);
    if (user.given_name)
        user.given_name = quote(user.given_name);

    callback(null, user, context);
}
