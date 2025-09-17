const conf = JSON.parse(localStorage.conf || '{}');
const {log} = console;
let creds;
let accessToken;
let ws;
let wsOnMsgHooks = {};
let eventPayloadTypes;
let heartbeatCountdownIntervalId;
let tsLockDiff = 0;
const uid = (i => () => 'cm_id_' + i++)(1);
const sortAlphabet = (a, b) => a.localeCompare(b);

if (!conf.creds) {
	_cred.innerText = 'Credentials (❌)';
	_credForget.disabled = true;
} else {
	creds = conf.creds;
	({accessToken} = creds);
	_cred.innerText = 'Credentials (✅)';
	_credForget.disabled = false;
	
	Object.keys(creds).map(k =>
		_credsDialog.querySelector(`input[name=${k}]`).value = creds[k]
	);
}

const pb = protobuf.Root.fromJSON(window.pbCompiledSrc).nested;
window.pbCompiledSrc = undefined;
const {evts,reqs2,reqs1} = categorizeMessages(Object.keys(pb));

_evts.innerHTML = evts.map(i=>i.slice(0,-5)).map(i => ''+
`<div class="flasher">
	<label style="display:block">
		<input type="checkbox" name="${i}" class="flasher-input" />${i}</label>
</div>`).join('\n');

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
	_credDialogRemember.checked = conf.credDialogRemember;
	
	_tsLock.checked = conf.tsLock;
	emit(_tsLock, 'change');
	_accLock.checked = conf.accLock;
	_accLock.disabled = !_accLock.checked;
	emit(_accLock, 'change');
	_symLock.checked = conf.symLock;
	_symLock.disabled = !_symLock.checked;
	emit(_symLock, 'change');
	
	if (conf.autoConnect) {
		emit(_conn, 'click');
	}
	if (_accLoadAuto.checked) _accLoad.disabled = true;
	if (_accAuthAuto.checked) _accAuth.disabled = true;
	if (_symLoadAuto.checked) _symLoad.disabled = true;
	
	if (_accLock.checked && conf.lockedAccount) {
		_accLoad.disabled = true;
		_accLoadAutoText.style.color = 'lightgrey';
		_accLoadAuto.disabled = true;
		const {lockedAccount: {name, value}} = conf;
		_acc.innerHTML = `<option value="${value}">${name}</option>`;
	}
	
	if (_symLock.checked && conf.lockedSymbol) {
		_symLoad.disabled = true;
		_symLoadAutoText.style.color = 'lightgrey';
		_symLoadAuto.disabled = true;
		const {lockedSymbol: {name, value}} = conf;
		_sym.innerHTML = `<option value="${value}">${name}</option>`;
	}
	
	changeMessage();
	if (_msgs.options.length) emit(_msgs, 'change');
	
	const {events} = conf;
	if (events) {
		const checkboxes = [..._evts.querySelectorAll('input[type=checkbox]')];
		for (const el of checkboxes) el.checked = events[el.name];
		const allChecked = checkboxes.every(i=>i.checked);
		_evtAllSwitch.checked = allChecked;
		_evtAllSwitch.indeterminate = !allChecked && checkboxes.some(i=>i.checked);
	}
});

_evts.addEventListener('change', function (e) {
	const checkboxes = [..._evts.querySelectorAll('input[type=checkbox]')];
	conf.events = Object.fromEntries(checkboxes.map(i => [i.name, i.checked]));
	localStorage.conf = JSON.stringify(conf);
	const allChecked = checkboxes.every(i=>i.checked);
	_evtAllSwitch.checked = allChecked;
	_evtAllSwitch.indeterminate = !allChecked && checkboxes.some(i=>i.checked);
});
function toggleAllEvents(bool) {
	for (const el of _evts.querySelectorAll('input[type=checkbox]')) {
		el.checked = bool;
	}
	emit(_evts, 'change');
}


function changeCredentials() {
	_credsDialog.showModal();
	_credsDialog.onclose = function () {
		const res = _credsDialog.returnValue;
		if (res) {
			const [newCreds, shouldRemember] = JSON.parse(res);
			const [clientId,clientSecret,at,refreshToken] = newCreds;
			creds = {clientId,clientSecret,accessToken:at,refreshToken};
			accessToken = at;
			if (shouldRemember) {
				conf.creds = creds;
				localStorage.conf = JSON.stringify(conf);
			}
			_cred.innerText = 'Credentials (✅)';
			_credForget.disabled = false;
			_cred.style.border = '';
		} else {
			if (!conf.creds) _cred.innerText = 'Credentials (❌)';
		}
		_credsDialog.onclose = undefined;
	};
}

function forgetCredentials() {
	if (confirm('Are you sure?')) {
		Object.keys(creds).map(k => 
			_credsDialog.querySelector(`input[name=${k}]`).value = ''
		);
		delete conf.creds;
		localStorage.conf = JSON.stringify(conf);
		_cred.innerText = 'Credentials (❌)';
		_credForget.disabled = true;
	}
}

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
	if (id === '_credDialogRemember') conf.credDialogRemember = !!el.checked;
	if (id === '_tsLock') {
		conf.tsLock = !!el.checked;
		tsLockDiff = Math.abs((+_tsToVal.value) - (+_tsFromVal.value));
		setLockIcon(_tsLockIcon, el.checked);
	}
	if (id === '_accLock') {
		const {checked} = el;
		conf.accLock = !!checked;
		setLockIcon(_accLockIcon, checked);
		if (checked) {
			if (_acc.options.length) {
				const acc = _acc.selectedOptions[0];
				conf.lockedAccount = {name: acc.innerText, value: acc.value};
				_accLoad.disabled = true;
				_accLoadAuto.disabled = true;
				_accLoadAutoText.style.color = 'lightgrey';
			}
		} else {
			_accLoad.disabled = false;
			_accLoadAuto.disabled = false;
			_accLoadAutoText.style.color = '';
		}
	}
	if (id === '_symLock') {
		const {checked} = el;
		conf.symLock = !!checked;
		setLockIcon(_symLockIcon, checked);
		if (checked) {
			if (_sym.options.length) {
				const sym = _sym.selectedOptions[0];
				conf.lockedSymbol = {name: sym.innerText, value: sym.value};
				_symLoad.disabled = true;
				_symLoadAuto.disabled = true;
				_symLoadAutoText.style.color = 'lightgrey';
			}
		} else {
			_symLoad.disabled = false;
			_symLoadAuto.disabled = false;
			_symLoadAutoText.style.color = '';
		}
	}
	localStorage.conf = JSON.stringify(conf);
}


function setLockIcon(container, bool) {
	container.innerHTML = ({'true':icons.lock,'false':icons.unlock})[bool];
}

function changeMessage(el) {
	const data = [reqs2, reqs1];
	const filt = [_msgsFilter2Way, _msgsFilter1Way];
	
	const r = [0,1]
		.map(i => filt[i].checked ? data[i] : 0)
		.filter(i=>i)
		.flat()
		.toSorted(sortAlphabet);
	
	const hasSome = r.length;
	_send.disabled = !hasSome;
	if (!hasSome) _msg.innerHTML = '';
	
	_msgs.innerHTML = r.map(i=>`<option value="ProtoOA${i}Req">${i}</option>`).join('\n');
	
	if (el) updateAutoState(el);
	if (_msgs.options.length) emit(_msgs, 'change');
}

function changeTimestamps(el) {
	let [frm, to] = [_tsFromVal, _tsToVal].map(i => +i.value);
	if (to > frm) {
		if (el.id === '_tsFromVal') {
			_tsToVal.value = --frm;
		} else if (el.id === '_tsToVal') {
			_tsFromVal.value = ++to;
		}
	}
	
	if (_tsLock.checked) {
		if (el.id === '_tsFromVal') {
			_tsToVal.value = frm - tsLockDiff;
		} else if (el.id === '_tsToVal') {
			_tsFromVal.value = tsLockDiff + to;
		}
	}
	
	if (_msg.hasChildNodes()) {
		const _targ1 = _msg.querySelector('input[name="fromTimestamp"]');
		if (_targ1) _targ1.value = getRelativeTimestamp(frm, _tsFromUnit.selectedOptions[0].value);
		
		const _targ2 = _msg.querySelector('input[name="toTimestamp"]');
		if (_targ2) _targ2.value = getRelativeTimestamp(to, _tsToUnit.selectedOptions[0].value);
	}
}

function getRelativeTimestamp(value, unit) {
	const d = new Date();
	const m = ({sec:'Seconds',min:'Minutes',day:'Date'})[unit];
	d['set'+m](d['get'+m]() - value);
	return +d;
}

function loadSymbols() {
	// highlight chain: !creds, !connected, !appauth, !accload, !accauth
	if (!creds || !ws || ws.readyState !== WebSocket.OPEN ||
		_appAuth.innerText === 'Auth App' ||
		!_acc.options.length ||
		_accAuth.innerText === 'Auth') {
		
		if (!ws || ws.readyState !== WebSocket.OPEN) _conn.style.border = '2px dashed red';
		if (_appAuth.innerText === 'Auth App') _appAuth.style.border = '2px dashed red';
		if (!_acc.options.length) _accLoad.style.border = '2px dashed red';
		if (_accAuth.innerText === 'Auth') _accAuth.style.border = '2px dashed red';
		
		return;
	}
	_cred.style.border = '';
	_conn.style.border = '';
	_appAuth.style.border = '';
	_accLoad.style.border = '';
	_accAuth.style.border = '';
	
	_symLoad.disabled = true;
	_symLoad.innerText = 'Load (...)';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (payloadType === 2115) {
			const syms = res.payload.symbol;
			syms.sort(({symbolName:a},{symbolName:b})=>sortAlphabet(a,b));
			_sym.innerHTML = syms.map(({symbolId, symbolName})=>
				`<option value="${symbolId}">${symbolName}</option>`
			);
			_symLoad.innerText = 'Load (✅)';
			_symLoad.disabled = true;
			_symLock.disabled = false;
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			_symLoad.innerText = 'Load (❌)';
			_dialogMsg.style.color = 'red';
			_dialogMsg.innerHTML = `<b>${errorCode}</b>: ${description}`;
			_dialog.showModal();
			_symLoad.disabled = false;
		}
		
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
	if (_symLock) {
		const sym = _sym.selectedOptions[0];
		conf.lockedSymbol = {name: sym.innerText, value: sym.value};
		localStorage.conf = JSON.stringify(conf);
	}
}

function authAccount() {
	// highlight chain: !creds, !connected, !appauth, !accload
	if (!creds || !ws || ws.readyState !== WebSocket.OPEN ||
		_appAuth.innerText === 'Auth App' ||
		!_acc.options.length) {
		
		if (!creds) _cred.style.border = '2px dashed red';
		if (!ws || ws.readyState !== WebSocket.OPEN) _conn.style.border = '2px dashed red';
		if (_appAuth.innerText === 'Auth App') _appAuth.style.border = '2px dashed red';
		if (!_acc.options.length) _accLoad.style.border = '2px dashed red';
		
		return;
	}
	_cred.style.border = '';
	_conn.style.border = '';
	_appAuth.style.border = '';
	_accLoad.style.border = '';
	
	_accAuth.innerText = 'Auth (...)';
	_accAuth.disabled = true;
	
	_dialogMsg.innerHTML = '';
	_dialogMsg.style.color = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (payloadType === 2103) {
			_accAuth.innerText = 'Auth (✅)';
			if (!_symLock.checked && _symLoadAuto.checked) emit(_symLoad, 'click');
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			if (errorCode === 'ALREADY_LOGGED_IN') {
				_accAuth.innerText = 'Auth (✅)';
			} else {
				_accAuth.innerText = 'Auth (❌)';
				_dialogMsg.style.color = 'red';
				_dialogMsg.innerHTML = `<b>${errorCode}</b>: ${description}`;
				_dialog.showModal();
				_accAuth.disabled = false;
			}
		} else {
			_accAuth.innerText = 'Auth (🤷‍♂️)';
			_dialogMsg.innerText = JSON.stringify(payload);
			_dialog.showModal();
			_accAuth.disabled = false;
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
		_accAuth.innerText = 'Auth (❌)';
	}
	if (_accLock) {
		const acc = _acc.selectedOptions[0];
		conf.lockedAccount = {name: acc.innerText, value: acc.value};
		localStorage.conf = JSON.stringify(conf);
	}
}

function loadAccounts() {
	// highlight chain: !creds, !connected, !appauth
	if (!creds || !ws || ws.readyState !== WebSocket.OPEN ||
		_appAuth.innerText === 'Auth App') {
		
		if (!creds) _cred.style.border = '2px dashed red';
		if (!ws || ws.readyState !== WebSocket.OPEN) _conn.style.border = '2px dashed red';
		if (_appAuth.innerText === 'Auth App') _appAuth.style.border = '2px dashed red';
		
		return;
	}
	_cred.style.border = '';
	_conn.style.border = '';
	_appAuth.style.border = '';
	_accLoad.style.border = '';
	
	_accLoad.disabled = true;
	_accLoad.innerText = 'Load (...)';
	_dialogMsg.innerHTML = '';
	_dialogMsg.style.color = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (res.payloadType === 2150) {
			const accs = res.payload.ctidTraderAccount;
			_acc.innerHTML = accs.map(({ctidTraderAccountId: id, isLive, brokerTitleShort: broker})=>
				`<option value="${id}">${id} - ${isLive?'Live':'Demo'} - ${broker}</option>`
			);
			_accLoad.disabled = true;
			_accLoad.innerText = 'Load (✅)';
			_accLock.disabled = false;
			if (_msgs.options.length) emit(_msgs, 'change');
			if (_accAuthAuto.checked) emit(_accAuth, 'click');
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			_appAuth.style.border = '2px dashed red';
			_accLoad.innerText = 'Load (❌)';
			_accLoad.disabled = false;
			_dialogMsg.style.color = 'red';
			_dialogMsg.innerHTML = '❌Could not load accounts <br><br>'+
				`<b>${errorCode}</b>: ${description}`;
			_dialog.showModal();
		} else {
			_dialogMsg.innerText = '🤷‍♂️Dont\' know what happened. <br><br>' + JSON.stringify(payload);
			_dialog.showModal();
		}
		delete wsOnMsgHooks[clientMsgId];
		
	};
	
	const req = {clientMsgId, payloadType: 2149, payload: {accessToken}};
	ws.sendj(req);
}

function authApplication() {
	// highlight chain: !creds, !connected
	if (!creds || !ws || ws.readyState !== WebSocket.OPEN) {
		if (!creds) _cred.style.border = '2px dashed red';
		if (!ws || ws.readyState !== WebSocket.OPEN) _conn.style.border = '2px dashed red';
		return;
	}
	_cred.style.border = '';
	_conn.style.border = '';
	_appAuth.style.border = '';
	
	_appAuth.disabled = true;
	_appAuth.innerText = 'Auth App (...)';
	_dialogMsg.innerHTML = '';
	_dialogMsg.style.color = '';
	
	const clientMsgId = uid();
	wsOnMsgHooks[clientMsgId] = res => {
		const {payloadType} = res;
		if (payloadType === 2101) {
			_appAuth.innerText = 'Auth App (✅)';
			if (!_accLock.checked && _accLoadAuto.checked) emit(_accLoad, 'click');
			if (_accLock.checked && _accAuthAuto.checked) emit(_accAuth, 'click');
		} else if (payloadType === 2142) {
			const {errorCode, description} = res.payload;
			_appAuth.innerText = 'Auth App (❌)';
			_dialogMsg.style.color = 'red';
			_dialogMsg.innerHTML = `<b>${errorCode}</b>: ${description}`;
			_dialog.showModal();
			_appAuth.disabled = false;
		} else {
			_appAuth.innerText = 'Auth App (🤷‍♂️)';
			_dialogMsg.style.color = '';
			_dialogMsg.innerHTML = JSON.stringify(payload);
			_dialog.showModal();
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
	_conn.style.border = '';
	_conn.disabled = true;
	_conn.innerText = 'Connect (...)';
	_res.value = '';
	_res.style.color = '';
	
	ws.onopen = function () {
		_conn.innerText = 'Connect (✅)';
		_accAuth.innerText = 'Auth';
		_accAuth.disabled = false;
		if (_appAuthAuto.checked) authApplication();
	};

	ws.onmessage = function (event) {
		const msg = JSON.parse(event.data);
		const {payloadType} = msg;
		
		if (eventPayloadTypes.has(payloadType)) {
			const el = eventElems[payloadType];
			flashElem(el, 'khaki', 0.1, 0.1);
			
			if (!el.querySelector('input').checked) {
				return;
			}
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
			return;
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

function constructPayload(fields, r={}, recurring) {
	for (const field of fields) {
		const [fieldName, formElem, ptype] = field;
		const isFieldDeep = ptype.startsWith('ProtoOA') && pb[ptype].fields ? true : false;
		
		if (isFieldDeep) {
			r[fieldName] = {};
			const subfieldNames = new Set(Object.keys(pb[ptype].fields));
			const subfields = fields.filter(([fieldName]) => subfieldNames.has(fieldName));
			constructPayload(subfields, r[fieldName], true);
		} else {
			const {type} = formElem;
			let val;
			if (['text','password','number'].includes(type) && formElem.value) {
				val = formElem.value;
				if (type === 'number') val = +val;
			} else {
				if (type === 'checkbox') {
					val = formElem.checked;
				} else if (type === 'select-one') {
					val = +formElem.selectedOptions[0].value;
				}
			}
			if (val !== undefined) r[formElem.name] = val;
		}
	}
	
	if (!recurring) return r;
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
	
	
	var fieldNames = [..._msg.querySelectorAll('div[data-field]')].map(i=>i.innerText.slice(0,-1));
	var formElems = [..._msg.querySelectorAll('div[data-field]+div')].map(i=>i.querySelector(':scope > input,select'));
	var ptypes = [..._msg.querySelectorAll('div[data-field]+div+div')].map(i=>i.innerText);
	var fields = fieldNames.map((v,i) => [v, formElems[i], ptypes[i]]);
	
	const payload = constructPayload(fields);
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
		const isFieldDeep = type.startsWith('ProtoOA') && pb[type].fields ? true : false;
		
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
			r += `<div data-field><label for="${fieldkey}">${fieldkey}:</label></div>`;
			if (isFieldEnum) {
				r += `<div><select id="${fieldkey}" name="${fieldkey}">`;
				r += fieldEnum.map(([v,k])=>`<option value="${v}">${k}</option>`).join('\n');
				r += `</select></div>`;
			} else if (isFieldDeep) {
				r += `<div>▼—————deep—————▼</div>`;
			} else {
				let inptyp = 'text';
				if (type === 'bool') inptyp = 'checkbox';
				if (type.startsWith('int') || type === 'double') inptyp = 'number';
				let inpval =  '';
				if (creds && Object.keys(creds).includes(fieldkey)) {inpval = creds[fieldkey]; inptyp = 'password';}
				if (fieldkey === 'ctidTraderAccountId' && _acc.options.length) inpval = +_acc.selectedOptions[0].value;
				if (fieldkey === 'symbolId' && _sym.options.length) inpval = +_sym.selectedOptions[0].value;
				if (fieldkey === 'fromTimestamp') inpval = getRelativeTimestamp(+_tsFromVal.value, _tsFromUnit.selectedOptions[0].value);
				if (fieldkey === 'toTimestamp') inpval = getRelativeTimestamp(+_tsToVal.value, _tsToUnit.selectedOptions[0].value);
				r += `<div><input id="${fieldkey}" type="${inptyp}" name="${fieldkey}" ${required?'required':''} value="${inpval}" /></div>`;
			}
			const typeFmt = type.startsWith('ProtoOA') ? type.slice(7) : type;
			r += `<div title="${isFieldEnum ? fieldEnumFmt : ''}" class="${typcolrs[type]||'ccust'}">${typeFmt}</div>`;
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

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// util
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

function spotlight(el, bool) {
	el.style.border = bool ? '2px dashed red' : '';
}

function emit(el, evt) {
	el.dispatchEvent(new Event(evt, {bubbles: true}));
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// vijual

const lockIconStyle = ''+
`width: 15px;
height: 15px;
stroke: currentColor;
fill: none;
stroke-width: 2;
vertical-align: sub;`;

const icons = {};
icons.lock = ''+
`<svg viewBox="0 0 24 24" style="${lockIconStyle}">
  <path d="M8 11V7a4 4 0 118 0v4"></path>
  <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
</svg>`;
icons.unlock = ''+
`<svg class="icon" viewBox="0 0 24 24" style="${lockIconStyle}">
  <path d="M12 11V7a4 4 0 118 0"></path>
  <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
</svg>`;

_cred.title = `Input your credentials here.`;
_credForget.title = `Forget remembered credentials.
📋Effective at next page refresh.`;

_conn.title = `Connect to the server.`;
_connAutoContainer.title = `Automatically connect to server.
📋Effective at next page refresh.
`;
_connKeepContainer.title = `Keep connection open by sending heartbeat messages.`;
_connKeepFlashTarget1.title = `Indicates when client is sending heartbeat to server.`;
_connKeepFlashTarget2.title = `Indicates when server is sending heartbeat to client.`;

_appAuth.title = `Authenticate the application.
📋Requires:
1.✔Credentials have been provided.
2.✔Being connected to server.`;
_appAuthAutoContainer.title = `Automatically authenticate the application.
📋Effective at next page refresh.
`;

_acc.title = `Account used for "ctidTraderAccount" field of a message.
📋If message has such field.`;
_accLoad.title = `Load all accounts.
📋Requires:
1 ✔Credentials have been provided.
2 ✔Being connected to server.
3 ✔Application has been authenticated.`;

_accLockContainer.title = `Lock to currently selected account.
📋Disables account loading.
📋Effective at next page refresh.`;
_accLoadAutoContainer.title = `Automatic account loading.
📋Eeffective at next page refresh.`;

_accAuth.title = `Authenticate the selected account.
📋Requires:
1 ✔Credentials have been provided.
2 ✔Being connected to server.
3 ✔Application has been authenticated.
4 ✔An account is selected. (through either account loading or locking)`;
_accAuthAutoContainer.title = `Automatic account auth.
📋Effective at next page refresh.`;

_sym.title = `Symbol used for "symbolId" field of a message.
📋If message has such field.`;
_symLoad.title = `Load all symbols.
📋Requires:
1 ✔Credentials have been provided.
2 ✔Being connected to server.
3 ✔Application has been authenticated.
4 ✔An account have been authenticated.
5 ✔A symbol is selected. (through either symbol loading or locking)`;
_symLockContainer.title = `Lock to currently selected symbol.
📋Disables symbol loading.
📋Effective at next page refresh.`;
_symLoadAutoContainer.title = `Automatic symbol loading.
📋Effective at next page refresh.`

_tsSectionLabel.title = `Timestamps used for "fromTimestamp" and "toTimestamp" fields of a message.
📋If message has such fields.`;
_tsFromContainer.title = `Timestamp for "fromTimestamp" field,
📋Specified in a relative manner. (0 means now)`;
_tsToContainer.title = `Timestamp for "toTimestamp" field,
📋Specified in a relative manner. (0 means now)`;
_tsLockContainer.title = `Lock distance between "from" and "to" values.`;

_msgs.title = `The ProtoOA message to send to the server.
📋Upon selecting, fields of the message are shown below.`;
_send.title = `Send selected message with its fields.
📋Empty fields are not added to the "payload".`;
_msgsFilter2WayContainer.title = `Show 2-way messages only.
📋Messages where there's a corresponding Res for the Req.`;
_msgsFilter1WayContainer.title = `Show 1-way messages only.
📋Messages where there's only a Req.`;

_evtsBanner.title = `Indicates event-like messages from the server.
📋Server response is only shown if an item is checked.`;
