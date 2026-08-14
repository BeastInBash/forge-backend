/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // config-conventional caps these at 100 chars, which rejects pasted URLs,
        // stack traces and generated trailers in commit bodies/footers.
        'body-max-line-length': [0, 'always'],
        'footer-max-line-length': [0, 'always']
    }
};
