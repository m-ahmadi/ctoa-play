const {join} = require('path');
const {existsSync: exists, readFileSync: read, writeFileSync: write, unlinkSync: del} = require('fs');
const {execSync} = require('child_process');
const {minify_sync} = require('terser');
process.chdir(__dirname);


const PB_SRC_DIR = 'openapi-proto-messages';
const OUT_FILEPATH = join(__dirname, '../docs/lib/pb.compiled');

if (!exists(PB_SRC_DIR)) execSync('git clone git@github.com:spotware/openapi-proto-messages.git');

process.chdir(PB_SRC_DIR);

execSync(`pbjs -t json -o ${OUT_FILEPATH}.json `+
	'OpenApiMessages.proto '+
	'OpenApiModelMessages.proto '+
	'OpenApiCommonMessages.proto '+
	'OpenApiCommonModelMessages.proto'
);

const prettyCode = `window.pbCompiledSrc = ${read(OUT_FILEPATH+'.json','utf8')};`;

const {error, code: uglyCode} = minify_sync(prettyCode);
if (error) throw error;

write(OUT_FILEPATH+'.min.js', uglyCode);
del(OUT_FILEPATH+'.json');
