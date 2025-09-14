const conf = JSON.parse(localStorage.conf || '{}');
const {log} = console;
let creds;
let ws;
let wsOnMsgHooks = {};
let heartbeatCountdownIntervalId;
const uid = (i => () => 'cm_id_' + i++)(1);
const sortAlphabet = (a, b) => a.localeCompare(b);

if (!conf.creds) {
	alert('You have not provided your credentials yet.');
	_credForget.disabled = true;
	changeCredentials();
} else {
	creds = conf.creds;
	_cred.innerText = 'Credentials (✅)';
	_credForget.disabled = false;
}

const { accessToken } = creds;

const pb = protobuf.Root.fromJSON(window.pbCompiledSrc).nested;
window.pbCompiledSrc = undefined;

const {reqs,ress,evts,reqs2,reqs1} = categorizeMessages(Object.keys(pb));
const reqs1Set = new Set(reqs1);
const reqs2Set = new Set(reqs2);


_evts.innerHTML = evts.map(i=>i.slice(0,-5))
	.map(i => `<tr><td><div class="flasher">${i}</div></td></tr>`).join('\n');

eventElems = Object.fromEntries([..._evts.querySelectorAll('.flasher')].map(el => [
	pb['ProtoOA'+el.innerText+'Event'].fields.payloadType.defaultValue, el
]));
eventPayloadTypes = new Set(Object.keys(eventElems).map(parseFloat));

document.addEventListener('DOMContentLoaded', function () {
	const ck = new Set(Object.keys(conf));
	if (!ck.has('filterMessages2Way') && !ck.has('filterMessages1Way')) {
		conf.filterMessages2Way = true;
		conf.filterMessages1Way = true;
	}
	
	_connAuto.checked = conf.autoConnect;
	_connKeep.checked = conf.keepConnection;
	_appAuthAuto.checked = conf.autoAppAuth;
	_accLoadAuto.checked = conf.autoLoadAccounts;
	_accAuthAuto.checked = conf.autoAccountAuth;
	_symLoadAuto.checked = conf.autoLoadSymbols;
	_msgsFilter2Way.checked = conf.filterMessages2Way;
	_msgsFilter1Way.checked = conf.filterMessages1Way;
	
	if (conf.autoConnect) {
		_conn.dispatchEvent(new Event('click',{bubbles:true}));
	}
	if (_accLoadAuto.checked) _accLoad.disabled = true;
	if (_accAuthAuto.checked) _accAuth.disabled = true;
	if (_symLoadAuto.checked) _symLoad.disabled = true;
	
	changeMessage();
	if (_msgs.options.length) _msgs.dispatchEvent(new Event('change',{bubbles:true}));
});


function updateAutoState(el) {
	const {id} = el;
	if (id === '_connAuto') conf.autoConnect = !!el.checked;
	if (id === '_connKeep') conf.keepConnection = !!el.checked;
	if (id === '_appAuthAuto') conf.autoAppAuth = !!el.checked;
	if (id === '_accLoadAuto') conf.autoLoadAccounts = !!el.checked;
	if (id === '_accAuthAuto') conf.autoAccountAuth = !!el.checked;
	if (id === '_symLoadAuto') conf.autoLoadSymbols = !!el.checked;
	if (id === '_msgsFilter2Way') conf.filterMessages2Way = !!el.checked;
	if (id === '_msgsFilter1Way') conf.filterMessages1Way = !!el.checked;
	localStorage.conf = JSON.stringify(conf);
}

function changeMessage(el) {
	const data = [reqs2, reqs1];
	const filt = [_msgsFilter2Way, _msgsFilter1Way];
	
	const r = [0,1]
		.map(i => filt[i].checked ? data[i] : 0)
		.filter(i=>i)
		.flat()
		.toSorted(sortAlphabet);
	
	_send.disabled = !r.length;
	_msgs.innerHTML = r.map(i=>`<option value="ProtoOA${i}Req">${i}</option>`).join('\n');
	
	if (el) updateAutoState(el);
	if (_msgs.options.length) _msgs.dispatchEvent(new Event('change',{bubbles:true}));
}



function loadAccounts() {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		_conn.style.border = '2px dashed red';
		return;
	}
	_conn.style.border = '';
	_accLoad.style.border = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (res.payloadType === 2150) {
			const accs = res.payload.ctidTraderAccount;
			_acc.innerHTML = accs.map(({ctidTraderAccountId: id, isLive, brokerTitleShort: broker})=>
				`<option value="${id}">${id} - ${isLive?'Live':'Demo'} - ${broker}</option>`
			);
			_accLoad.disabled = true;
			if (_msgs.options.length) _msgs.dispatchEvent(new Event('change',{bubbles:true}));
			if (_accAuthAuto.checked) _accAuth.dispatchEvent(new Event('click',{bubbles:true}));
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			_acc.innerHTML = '<option style="color:red;">❌Could not load accounts</option>';
			_accLoadLabel.style.color = 'red';
			_accLoadLabel.innerHTML = `<b>${errorCode}</b>: ${description}`;
		} else {
			_acc.innerHTML = '<option style="color:red;">🤷‍♂️Dont\' know what happened.</option>';
			_accLoadLabel.innerText = JSON.stringify(payload);
		}
		delete wsOnMsgHooks[clientMsgId];
		
	};
	const req = {clientMsgId, payloadType: 2149, payload: {accessToken}};
	ws.sendj(req);
}



function authAccount() {
	if (!ws || ws.readyState !== WebSocket.OPEN || !_acc.options.length) {
		if (!ws || ws.readyState !== WebSocket.OPEN) _conn.style.border = '2px dashed red';
		if (!_acc.options.length) _accLoad.style.border = '2px dashed red';
		return;
	}
	_conn.style.border = '';
	_accLoad.style.border = '';
	_accAuthLabel.innerHTML = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (payloadType === 2103) {
			_accAuth.innerText = 'Auth Account (✅)';
			_accAuth.disabled = true;
			if (_symLoadAuto.checked) _symLoad.dispatchEvent(new Event('click',{bubbles:true}));
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			if (errorCode === 'ALREADY_LOGGED_IN') {
				_accAuth.innerText = 'Auth Account (✅)';
				_accAuth.disabled = true;
			} else {
				_accAuth.innerText = 'Auth Account (❌)';
				_accAuthLabel.style.color = 'red';
				_accAuthLabel.innerHTML = `<b>${errorCode}</b>: ${description}`;
			}
		} else {
			_accAuth.innerText = 'Auth Account (🤷‍♂️)';
			_accAuthLabel.innerText = JSON.stringify(payload);
		}
		delete wsOnMsgHooks[clientMsgId];
	};
	const req = {clientMsgId, payloadType: 2102, payload: {
		accessToken,
		ctidTraderAccountId: +_acc.selectedOptions[0].value,
	}};
	ws.sendj(req);
}

function changeAccount(newAccountId) {
	if (_msg.hasChildNodes()) {
		const _targ = _msg.querySelector('input[name="ctidTraderAccountId"]');
		if (_targ) _targ.value = newAccountId;
	}
	if (_accAuth.disabled) {
		_accAuth.disabled = false;
		_accAuth.innerText = 'Auth Account (❌)';
	}
}



function loadSymbols() {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		_conn.style.border = '2px dashed red';
		return;
	}
	_conn.style.border = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		if (res.payloadType !== 2115) throw Error('fuk');
		const syms = res.payload.symbol;
		syms.sort(({symbolName:a},{symbolName:b})=>sortAlphabet(a,b));
		_sym.innerHTML = syms.map(({symbolId, symbolName})=>
			`<option value="${symbolId}">${symbolName}</option>`
		);
		_symLoad.innerText = 'Load (✅)';
		_symLoad.disabled = true;
		delete wsOnMsgHooks[clientMsgId];
	};
	const req = {clientMsgId, payloadType: 2114, payload: {
		accessToken,
		ctidTraderAccountId: +_acc.selectedOptions[0].value,
	}};
	ws.sendj(req);
}

function changeSymbol(newSymbolId) {
	if (_msg.hasChildNodes()) {
		const _targ = _msg.querySelector('input[name="symbolId"]');
		if (_targ) _targ.value = newSymbolId;
	}
}

function authApplication() {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		_conn.style.border = '2px dashed red';
		return;
	}
	_appAuth.disabled = true;
	_appAuth.innerText = 'Auth App (...)';
	_conn.style.border = '';
	_appAuthLabel.innerHTML = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (payloadType === 2101) {
			_appAuth.innerText = 'Auth App (✅)';
			if (_accLoadAuto.checked) _accLoad.dispatchEvent(new Event('click',{bubbles:true}));
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			_appAuth.innerText = 'Auth App (❌)';
			_appAuthLabel.style.color = 'red';
			_appAuthLabel.innerHTML = `<b>${errorCode}</b>: ${description}`;
			_appAuth.disabled = false;
		} else {
			_appAuth.innerText = 'Auth App (🤷‍♂️)';
			_appAuthLabel.style.color = '';
			_appAuthLabel.innerText = JSON.stringify(payload);
			_appAuth.disabled = false;
		}
		delete wsOnMsgHooks[clientMsgId];
	};
	
	const req = {clientMsgId, payloadType: 2100, payload: {
		clientId: creds['clientId'],
		clientSecret: creds['clientSecret'],
	}};
	
	ws.sendj(req);
}


function establishConnection() {
	ws = new WebSocket('wss://live.ctraderapi.com:5036');
	ws.__proto__.sendj = function (o) {this.send(JSON.stringify(o));}
	_conn.disabled = true;
	_conn.innerText = 'Connect (...)';
	_conn.style.border = '';
	_res.value = '';
	_res.style.color = '';
	
	ws.onopen = function () {
		_conn.innerText = 'Connect (✅)';
		_accAuth.innerText = 'Auth Account';
		_accAuth.disabled = false;
		if (_appAuthAuto.checked) authApplication();
	};

	ws.onmessage = function (event) {
		const msg = JSON.parse(event.data);
		const {payloadType} = msg;
		
		if (eventPayloadTypes.has(payloadType)) {
			const el = eventElems[payloadType];
			flashElem(el, 'khaki');
		}
		
		if (payloadType === 51) {
			flashElem(_connKeepFlashTarget2, 'red', 1, 2);
			const t = Date.now();
			heartbeatCountdownIntervalId = setInterval(() =>
				_hbtimer.innerHTML = `(⏳${Math.round((Date.now()-t) / 1000)})`
			, 1000);
			if (_connKeep.checked) {
				ws.sendj({payloadType: 51});
				setTimeout(()=>flashElem(_connKeepFlashTarget1, 'red', 1.5, 3), 1000);
				clearInterval(heartbeatCountdownIntervalId);
				_hbtimer.innerText = '';
			}
		}
		if (Object.keys(wsOnMsgHooks).length) wsOnMsgHooks[msg.clientMsgId](msg);
		
		const jsonstr = JSON.stringify(msg, null, 2);
		_res.innerHTML = Prism.highlight(jsonstr, Prism.languages.javascript, 'javascript');
	};

	ws.onclose = function () {
		_conn.innerText = 'Connect (❌)';
		_conn.disabled = false;
		clearInterval(heartbeatCountdownIntervalId);
		_hbtimer.innerText = '';
	};
}




function sendMessage() {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		_conn.style.border = '2px dashed red';
		_res.innerText = 'Not connected.';
		_res.style.color = 'red';
		return;
	}
	_conn.style.border = '';
	_res.innerText = '';
	_res.style.color = '';
	
	const fields = [..._msg.querySelectorAll('input'), ..._msg.querySelectorAll('select')];
	
	// TODO: handle deep field
	const rdy = fields.map(el => {
		const {type, name: key} = el;
		let val;
		
		if (type === 'text' || type === 'password') {
			val = el.value;
		} else if (type === 'number') {
			val = +el.value;
		} else if (type === 'checkbox') {
			val = el.checked;
		} else if (type === 'select-one') {
			val = +el.selectedOptions[0].value;
		}
		
		return [key, val];
	});
	
	const payload = Object.fromEntries(rdy);
	const payloadType = pb[_msgs.selectedOptions[0].value].fields.payloadType.defaultValue;
	const msg = {payloadType, payload};
	
	ws.sendj(msg);
}

function setupMsg(selected, r='', recurring) {
	// isMsg = has fields
	// isField = has type
	// isFieldEnum = field type is non primitive
	// isFieldDeep = field type in pb has fields itself
	
	const msg = pb[selected];
	
	let [int32,int64,double,bool,string] = ['cint','cint','cdbl','cbool','cstr'];
	const typcolrs = {int32,int64,double,bool,string};
	const ncccolrs = {'true':'reqrd','false':'optnl'};
	
	for (const fieldkey of Object.keys(msg.fields)) {
		const field = msg.fields[fieldkey];
		const {type, required} = field;
		
		const isFieldEnum = type.startsWith('ProtoOA') && !pb[type].fields;
		const isFieldDeep = type.startsWith('ProtoOA') && pb[type].fields;
		
		let fieldEnum, fieldEnumFmt;
		if (isFieldEnum) {
			const o = pb[type]?.values || {};
			fieldEnum = Object.keys(o).map(k => [o[k], k]);
			fieldEnumFmt = fieldEnum.map(i=>i.join('=')).join(', ');
		}
		
		if (fieldkey === 'payloadType') {
			r += `<div><u>${fieldkey}</u>:</div>`;
			r += `<div><code class="cuscode">${field.defaultValue}</code></div>`;
			r += `<div></div>`;
			r += `<div></div>`;
			r += `\n`;
		} else {
			r += `<div>${fieldkey}:</div>`;
			if (isFieldEnum) {
				r += `<div><select name="${fieldkey}">`;
				r += fieldEnum.map(([v,k])=>`<option value="${v}">${k}</option>`).join('\n');
				r += `</select></div>`;
			} else if (isFieldDeep) {
				r += `<div>▼—————deep—————▼</div>`;
			} else {
				let inptyp = 'text';
				if (type === 'bool') inptyp = 'checkbox';
				if (type.startsWith('int') || type === 'double') inptyp = 'number';
				let inpval =  '';
				if (Object.keys(creds).includes(fieldkey)) {inpval = creds[fieldkey]; inptyp = 'password';}
				if (fieldkey === 'ctidTraderAccountId' && _acc.options.length) inpval = +_acc.selectedOptions[0].value;
				if (fieldkey === 'symbolId' && _sym.options.length) inpval = +_sym.selectedOptions[0].value;
				r += `<div><input type="${inptyp}" name="${fieldkey}" ${required?'required':''} value="${inpval}" /></div>`;
			}
			r += `<div title="${isFieldEnum ? fieldEnumFmt : ''}" class="${typcolrs[type]||'ccust'}">${type}</div>`;
			r += `<div class="${ncccolrs[required]}">${required?'required':'optional'}</div>`;
			r += '\n';
		}
		
		if (isFieldDeep) {
			r += '<div>▼</div><div>▼</div><div>▼</div><div>▼</div>\n';
			r = setupMsg(type, r, true);
		}
	}
	
	if (recurring) {
		return r;
	} else {
		_msg.innerHTML = r;
	}
}


function changeCredentials() {
	const promptForCredentials = () => {
		const clientId = prompt('ClientID:');
		if (!clientId) return;
		const clientSecret = prompt('ClientSecret:');
		if (!clientSecret) return;
		const accessToken = prompt('AccessToken:');
		if (!accessToken) return;
		const refreshToken = prompt('RefreshToken:');
		if (!refreshToken) return;
		return {clientId,clientSecret,accessToken,refreshToken};
	};
	
	const newCreds = promptForCredentials();
	if (newCreds) {
		creds = newCreds;
		if (confirm('Remember for future?')) {
			conf.creds = newCreds;
			localStorage.conf = JSON.stringify(conf);
		}
		_cred.innerText = 'Credentials (✅)';
		_credForget.disabled = false;
	} else {
		alert('❌ You did not provide all credentials! (previously saved ones will not be modified)');
		if (!conf.creds) _cred.innerText = 'Credentials (❌)';
	}
}
function forgetCredentials() {
	if (confirm('Are you sure?')) {
		delete conf.creds;
		localStorage.conf = JSON.stringify(conf);
		_cred.innerText = 'Credentials (❌)';
		_credForget.disabled = true;
	}
}



function categorizeMessages(allMessageFullNames) {
	const prefix = 'ProtoOA';
	const poas = allMessageFullNames.filter(i=>i.startsWith(prefix)).map(i=>i.split(prefix)[1]);
	const reqs = poas.filter(i=>i.endsWith('Req'));
	const ress = poas.filter(i=>i.endsWith('Res'));
	const evts = poas.filter(i=>i.endsWith('Event'));

	const populate = (d, a, cutend, mark) => {
		for (const k of a) {
			const name = k.slice(0, -cutend);
			if (!d[name]) d[name] = [];
			d[name].push(mark)
		}
	}
	const d = {};
	populate(d, reqs, 3, '👉');
	populate(d, ress, 3, '👈');
	populate(d, evts, 5, '🔔');
	
	const reqs1 = Object.keys(d)
		.filter(k => d[k].includes('👉') && !d[k].includes('👈'))
		.toSorted(sortAlphabet);
	
	const reqs2 = Object.keys(d)
		.filter(k => d[k].includes('👉') && d[k].includes('👈'))
		.toSorted(sortAlphabet);
	
	[reqs,ress,evts, reqs2,reqs1].forEach(a => a.sort(sortAlphabet));
	return {reqs,ress,evts, reqs2,reqs1};
}

function flashElem(el, bgcolor='khaki', fadeoutAfter=0.15, fadeoutDuration=0.5) {
	el.style.transition = '';
	el.style.background = bgcolor;
	el.style.transition = `background ${fadeoutDuration}s`;
	setTimeout(()=> el.style.background = '', fadeoutAfter*1000);
}
/*

background: yellow;
background: gold;
background: khaki;
background: navajowhite;
background: palegoldenrod;
background: moccasin;
background: wheat;
background: tan;
background: darkkhaki;
background: lemonchiffon;
background: lightgoldenrodyellow;
background: lightyellow;
background: papayawhip;
background: peachpuff;
background: sandybrown;

background: lightblue;
background: lightskyblue;
background: mediumaquamarine;
background: mediumturquoise;


el.style.transition = '';
el.style.background = 'khaki';
el.style.transition = 'background 0.5s';
setTimeout(()=> el.style.background = '', 150);
*/