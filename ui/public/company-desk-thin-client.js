(() => {
  const EXISTING_ID = "company-desk-thin-client";
  const READ_STATE_KEY = "cd_phone_read_state_v1";
  const PHONE_LOG_KEY = "cd_phone_log_v1";

  const existing = document.getElementById(EXISTING_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const app = document.querySelector("openclaw-app");
  if (!app || !app.client || !app.connected) {
    alert("OpenClaw app client not connected. Open http://127.0.0.1:18789 and connect first.");
    return;
  }

  const loadJson = (k, fallback) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const saveJson = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  const state = {
    mode: "desk", // desk | phone | monitor
    agentId: "main",
    agents: ["main"],
    messages: [],
    phoneFrom: "main",
    phoneTo: "main",
    phoneBox: "inbox", // inbox | sent
    mirrorPhoneToDesk: false,
    unreadByAgent: {},
    readState: loadJson(READ_STATE_KEY, {}),
    phoneLog: loadJson(PHONE_LOG_KEY, []),
    monitorRows: [],
  };

  const wrap = document.createElement("div");
  wrap.id = EXISTING_ID;
  wrap.style.cssText = [
    "position:fixed",
    "right:16px",
    "top:16px",
    "width:470px",
    "height:84vh",
    "z-index:2147483647",
    "background:#0f1115",
    "color:#e6e6e6",
    "border:1px solid #2b2f3a",
    "border-radius:12px",
    "display:flex",
    "flex-direction:column",
    "font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
    "box-shadow:0 10px 30px rgba(0,0,0,.45)",
  ].join(";");

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #2b2f3a">
      <strong>Company Desk (Thin)</strong>
      <button id="cd-close" style="background:#222;border:1px solid #444;color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer">✕</button>
    </div>

    <div style="padding:8px;border-bottom:1px solid #2b2f3a;display:flex;gap:6px;flex-wrap:wrap" id="cd-agent-tabs"></div>

    <div style="padding:8px;border-bottom:1px solid #2b2f3a;display:flex;gap:8px">
      <button id="cd-mode-desk" style="background:#3b82f6;border:0;color:white;border-radius:8px;padding:6px 10px;cursor:pointer">Desk</button>
      <button id="cd-mode-phone" style="background:#222;border:1px solid #444;color:white;border-radius:8px;padding:6px 10px;cursor:pointer">Phone</button>
      <button id="cd-mode-monitor" style="background:#222;border:1px solid #444;color:white;border-radius:8px;padding:6px 10px;cursor:pointer">Comms Monitor</button>
    </div>

    <div id="cd-desk-controls" style="padding:10px;display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;border-bottom:1px solid #2b2f3a">
      <label style="display:flex;flex-direction:column;gap:4px">Agent
        <select id="cd-agent" style="background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px"></select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px">Thread
        <input id="cd-thread" value="main" style="background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px" />
      </label>
      <button id="cd-open" style="background:#3b82f6;border:0;color:white;border-radius:8px;padding:7px 10px;cursor:pointer">Open</button>
    </div>

    <div id="cd-phone-controls" style="display:none;padding:10px;grid-template-columns:1fr 1fr;gap:8px;align-items:end;border-bottom:1px solid #2b2f3a">
      <label style="display:flex;flex-direction:column;gap:4px">From
        <select id="cd-phone-from" style="background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px"></select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px">To
        <select id="cd-phone-to" style="background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px"></select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px">Thread (required)
        <input id="cd-phone-thread" value="general" style="background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px" />
      </label>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <button id="cd-box-inbox" style="background:#3b82f6;border:0;color:white;border-radius:8px;padding:7px 10px;cursor:pointer">Inbox</button>
        <button id="cd-box-sent" style="background:#222;border:1px solid #444;color:white;border-radius:8px;padding:7px 10px;cursor:pointer">Sent</button>
        <button id="cd-mirror" style="background:#222;border:1px solid #444;color:white;border-radius:8px;padding:7px 10px;cursor:pointer">Mirror→Desk OFF</button>
      </div>
    </div>

    <div id="cd-monitor-controls" style="display:none;padding:8px;border-bottom:1px solid #2b2f3a;gap:8px;align-items:center">
      <input id="cd-monitor-search" placeholder="Filter by agent/thread/text" style="flex:1;background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:6px" />
      <button id="cd-monitor-refresh" style="background:#222;border:1px solid #444;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer">Refresh</button>
    </div>

    <div style="padding:8px;border-bottom:1px solid #2b2f3a;display:flex;gap:8px">
      <button id="cd-refresh" style="background:#222;border:1px solid #444;color:#fff;border-radius:8px;padding:6px 8px;cursor:pointer">Refresh</button>
      <span id="cd-key" style="opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span>
    </div>

    <div id="cd-messages" style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px"></div>

    <div id="cd-send-row" style="padding:10px;border-top:1px solid #2b2f3a;display:flex;gap:8px">
      <textarea id="cd-input" placeholder="Send message... (Enter to send, Shift+Enter newline)" style="flex:1;min-height:58px;background:#171a22;color:#fff;border:1px solid #3a3f4c;border-radius:8px;padding:8px"></textarea>
      <button id="cd-send" style="background:#10b981;border:0;color:white;border-radius:8px;padding:10px 12px;cursor:pointer">Send</button>
    </div>
  `;

  document.body.appendChild(wrap);

  const $ = (id) => wrap.querySelector(id);
  const elAgent = $("#cd-agent");
  const elThread = $("#cd-thread");
  const elKey = $("#cd-key");
  const elMessages = $("#cd-messages");
  const elInput = $("#cd-input");
  const elAgentTabs = $("#cd-agent-tabs");

  const slugify = (v, fallback = "main") =>
    (v || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;

  const makeId = () =>
    (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
      ? globalThis.crypto.randomUUID()
      : `cd-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const deskSessionKey = () => {
    const thread = slugify(elThread.value, "main");
    return thread === "main"
      ? `agent:${state.agentId}:main`
      : `agent:${state.agentId}:desk:v1:thread:${thread}`;
  };

  const phoneBoxKey = () => {
    const who = state.phoneBox === "inbox" ? state.phoneTo : state.phoneFrom;
    return `agent:${who}:phone:v1:${state.phoneBox}`;
  };

  const activeSessionKey = () => (state.mode === "desk" ? deskSessionKey() : phoneBoxKey());

  const parseText = (m) => {
    if (Array.isArray(m?.content)) {
      return m.content.map((c) => (typeof c?.text === "string" ? c.text : "")).join("\n").trim();
    }
    if (typeof m?.text === "string") return m.text;
    return JSON.stringify(m);
  };

  const parseEnvelope = (text) => {
    if (!text || typeof text !== "string") return null;
    const [head, ...tail] = text.split("\n---\n");
    if (!head.includes("FROM=") || !head.includes("TO=")) return null;
    const val = (k) => (head.match(new RegExp(`${k}=([^\\s]+)`)) || [])[1] || "";
    return {
      from: val("FROM"),
      to: val("TO"),
      thread: val("THREAD"),
      kind: val("KIND"),
      msgId: val("MSG_ID"),
      ts: val("TS"),
      status: val("STATUS"),
      body: tail.join("\n---\n").trim(),
    };
  };

  const fmtTs = (ts) => {
    const n = Number(ts);
    return Number.isFinite(n) ? new Date(n).toLocaleTimeString() : "";
  };

  const renderMessages = () => {
    elMessages.innerHTML = "";
    const currentKey = activeSessionKey();
    state.messages.forEach((m) => {
      const role = (m && m.role) || "unknown";
      const text = parseText(m);
      const env = parseEnvelope(text);
      const box = document.createElement("div");
      box.style.cssText = `padding:8px;border-radius:8px;border:1px solid #2b2f3a;background:${role === "user" ? "#1f2937" : "#111827"}`;
      if (env) {
        box.innerHTML = `
          <div style="opacity:.75;margin-bottom:4px">${role} · ${env.from} → ${env.to} · ${env.thread || "-"} ${env.msgId ? `· ${env.msgId.slice(0,8)}` : ""}</div>
          <div style="opacity:.7;margin-bottom:4px">${env.status || ""} ${env.ts ? `· ${fmtTs(env.ts)}` : ""}</div>
          <div style="opacity:.6;margin-bottom:4px;font-family:ui-monospace,Menlo,monospace">${currentKey}</div>
          <div style="white-space:pre-wrap">${env.body || "(empty)"}</div>
        `;
      } else {
        box.innerHTML = `<div style="opacity:.7;margin-bottom:4px">${role}</div><div style="opacity:.6;margin-bottom:4px;font-family:ui-monospace,Menlo,monospace">${currentKey}</div><div style="white-space:pre-wrap">${text || "(empty)"}</div>`;
      }
      elMessages.appendChild(box);
    });
    elMessages.scrollTop = elMessages.scrollHeight;
  };

  const computeUnreadForAgent = async (agentId) => {
    const key = `agent:${agentId}:phone:v1:inbox`;
    const res = await app.client.request("chat.history", { sessionKey: key, limit: 1 });
    const msg = (res?.messages || [])[0];
    const ts = Number(msg?.timestamp || 0);
    const seen = Number(state.readState[agentId] || 0);
    return Number.isFinite(ts) && ts > seen;
  };

  const refreshUnread = async () => {
    const map = {};
    await Promise.all(state.agents.map(async (a) => {
      try { map[a] = await computeUnreadForAgent(a); } catch { map[a] = false; }
    }));
    state.unreadByAgent = map;
  };

  const renderAgentTabs = () => {
    elAgentTabs.innerHTML = "";
    state.agents.forEach((id) => {
      const b = document.createElement("button");
      const active = id === state.agentId;
      const unread = !!state.unreadByAgent[id];
      b.textContent = unread ? `${id} •` : id;
      b.style.cssText = `background:${active ? "#3b82f6" : "#222"};border:${active ? "0" : "1px solid #444"};color:#fff;border-radius:999px;padding:4px 10px;cursor:pointer`;
      b.onclick = async () => {
        state.agentId = id;
        elAgent.value = id;
        await loadHistory();
        renderAgentTabs();
      };
      elAgentTabs.appendChild(b);
    });
  };

  const renderMonitor = () => {
    const q = ($("#cd-monitor-search").value || "").trim().toLowerCase();
    const rows = q
      ? state.monitorRows.filter((r) => `${r.from} ${r.to} ${r.thread} ${r.body}`.toLowerCase().includes(q))
      : state.monitorRows;
    elMessages.innerHTML = "";
    rows.forEach((r) => {
      const box = document.createElement("div");
      const sessionKey = `agent:${r.owner}:phone:v1:${r.box}`;
      box.style.cssText = "padding:8px;border-radius:8px;border:1px solid #2b2f3a;background:#111827";
      box.innerHTML = `
        <div style="opacity:.75;margin-bottom:4px">${r.from} → ${r.to} · ${r.thread || "-"} · ${r.box}@${r.owner}</div>
        <div style="opacity:.7;margin-bottom:4px">${r.status || ""} ${r.ts ? `· ${fmtTs(r.ts)}` : ""}</div>
        <div style="opacity:.6;margin-bottom:4px;font-family:ui-monospace,Menlo,monospace">${sessionKey}</div>
        <div style="white-space:pre-wrap">${r.body || ""}</div>
      `;
      elMessages.appendChild(box);
    });
  };

  const renderMode = () => {
    const isDesk = state.mode === "desk";
    const isPhone = state.mode === "phone";
    const isMonitor = state.mode === "monitor";

    $("#cd-desk-controls").style.display = isDesk ? "grid" : "none";
    $("#cd-phone-controls").style.display = isPhone ? "grid" : "none";
    $("#cd-monitor-controls").style.display = isMonitor ? "flex" : "none";
    $("#cd-send-row").style.display = isMonitor ? "none" : "flex";

    $("#cd-mode-desk").style.background = isDesk ? "#3b82f6" : "#222";
    $("#cd-mode-desk").style.border = isDesk ? "0" : "1px solid #444";

    $("#cd-mode-phone").style.background = isPhone ? "#3b82f6" : "#222";
    $("#cd-mode-phone").style.border = isPhone ? "0" : "1px solid #444";

    $("#cd-mode-monitor").style.background = isMonitor ? "#3b82f6" : "#222";
    $("#cd-mode-monitor").style.border = isMonitor ? "0" : "1px solid #444";

    $("#cd-box-inbox").style.background = state.phoneBox === "inbox" ? "#3b82f6" : "#222";
    $("#cd-box-sent").style.background = state.phoneBox === "sent" ? "#3b82f6" : "#222";

    const mirrorBtn = $("#cd-mirror");
    mirrorBtn.textContent = state.mirrorPhoneToDesk ? "Mirror→Desk ON" : "Mirror→Desk OFF";
    mirrorBtn.style.background = state.mirrorPhoneToDesk ? "#3b82f6" : "#222";
    mirrorBtn.style.border = state.mirrorPhoneToDesk ? "0" : "1px solid #444";
  };

  const setAgentSelects = () => {
    const options = state.agents.map((id) => `<option value="${id}">${id}</option>`).join("");
    elAgent.innerHTML = options;
    $("#cd-phone-from").innerHTML = options;
    $("#cd-phone-to").innerHTML = options;

    elAgent.value = state.agentId;
    $("#cd-phone-from").value = state.phoneFrom;
    $("#cd-phone-to").value = state.phoneTo;
  };

  const loadAgents = async () => {
    const res = await app.client.request("config.get", {});
    const agents = (res?.config?.agents?.list || []).map((a) => a.id).filter(Boolean);
    state.agents = [...new Set(["main", ...agents])];
    state.agentId = state.agents.includes(state.agentId) ? state.agentId : state.agents[0] || "main";
    state.phoneFrom = state.agents.includes(state.phoneFrom) ? state.phoneFrom : state.agentId;
    state.phoneTo = state.agents.includes(state.phoneTo) ? state.phoneTo : state.agentId;
    setAgentSelects();
    await refreshUnread();
    renderAgentTabs();
  };

  const markInboxReadIfViewing = () => {
    if (state.mode !== "phone" || state.phoneBox !== "inbox") return;
    const who = state.phoneTo;
    const latest = state.messages[0]?.timestamp || Date.now();
    state.readState[who] = latest;
    saveJson(READ_STATE_KEY, state.readState);
    state.unreadByAgent[who] = false;
    renderAgentTabs();
  };

  const loadHistory = async () => {
    if (state.mode === "monitor") {
      await loadMonitor();
      return;
    }
    const key = activeSessionKey();
    elKey.textContent = key;
    const res = await app.client.request("chat.history", { sessionKey: key, limit: 120 });
    state.messages = Array.isArray(res?.messages) ? res.messages : [];
    renderMessages();
    markInboxReadIfViewing();
  };

  const loadMonitor = async () => {
    elKey.textContent = "Comms Monitor";
    const rows = [];
    await Promise.all(state.agents.flatMap((owner) => ["inbox", "sent"].map(async (box) => {
      try {
        const key = `agent:${owner}:phone:v1:${box}`;
        const res = await app.client.request("chat.history", { sessionKey: key, limit: 40 });
        const msgs = Array.isArray(res?.messages) ? res.messages : [];
        msgs.forEach((m) => {
          const txt = parseText(m);
          const env = parseEnvelope(txt);
          if (!env) return;
          rows.push({
            owner,
            box,
            from: env.from,
            to: env.to,
            thread: env.thread,
            body: env.body,
            status: env.status,
            ts: Number(env.ts || m.timestamp || 0),
          });
        });
      } catch {}
    })));

    state.monitorRows = rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    renderMonitor();
  };

  const sendDeskMessage = async (text) => {
    await app.client.request("chat.send", {
      sessionKey: deskSessionKey(),
      message: text,
      deliver: false,
      idempotencyKey: makeId(),
    });
  };

  const sendPhoneMessage = async (text) => {
    const from = state.phoneFrom;
    const to = state.phoneTo;
    const rawThread = $("#cd-phone-thread").value;
    if (!rawThread || !rawThread.trim()) {
      alert("Phone thread is required.");
      return;
    }
    const thread = slugify(rawThread, "general");
    const msgId = makeId();
    const ts = Date.now();
    const envelope = `FROM=${from} TO=${to} THREAD=${thread} KIND=internal_sms MSG_ID=${msgId} TS=${ts} STATUS=delivered\n---\n${text}`;

    await app.client.request("chat.send", {
      sessionKey: `agent:${to}:phone:v1:inbox`,
      message: envelope,
      deliver: false,
      idempotencyKey: makeId(),
    });

    try {
      await app.client.request("chat.inject", {
        sessionKey: `agent:${from}:phone:v1:sent`,
        note: envelope,
      });
    } catch {
      await app.client.request("chat.send", {
        sessionKey: `agent:${from}:phone:v1:sent`,
        message: `[SENT LOG]\n${envelope}`,
        deliver: false,
        idempotencyKey: makeId(),
      });
    }

    state.phoneLog.unshift({ msgId, from, to, thread, ts, status: "delivered" });
    state.phoneLog = state.phoneLog.slice(0, 400);
    saveJson(PHONE_LOG_KEY, state.phoneLog);

    if (state.mirrorPhoneToDesk) {
      const mirrorNote = `[PHONE INBOX MIRROR]\n${envelope}`;
      try {
        await app.client.request("chat.inject", {
          sessionKey: `agent:${to}:main`,
          note: mirrorNote,
        });
      } catch {
        await app.client.request("chat.send", {
          sessionKey: `agent:${to}:main`,
          message: mirrorNote,
          deliver: false,
          idempotencyKey: makeId(),
        });
      }
    }
    await refreshUnread();
    renderAgentTabs();
  };

  const sendMessage = async () => {
    const text = elInput.value.trim();
    if (!text) return;
    if (state.mode === "desk") {
      await sendDeskMessage(text);
    } else if (state.mode === "phone") {
      await sendPhoneMessage(text);
    }
    elInput.value = "";
    await loadHistory();
  };

  $("#cd-close").onclick = () => wrap.remove();
  $("#cd-open").onclick = async () => {
    state.agentId = elAgent.value;
    await loadHistory();
    renderAgentTabs();
  };
  $("#cd-refresh").onclick = async () => {
    await refreshUnread();
    renderAgentTabs();
    await loadHistory();
  };
  $("#cd-send").onclick = sendMessage;

  $("#cd-mode-desk").onclick = async () => {
    state.mode = "desk";
    renderMode();
    await loadHistory();
  };
  $("#cd-mode-phone").onclick = async () => {
    state.mode = "phone";
    renderMode();
    await loadHistory();
  };
  $("#cd-mode-monitor").onclick = async () => {
    state.mode = "monitor";
    renderMode();
    await loadHistory();
  };

  $("#cd-box-inbox").onclick = async () => {
    state.phoneBox = "inbox";
    renderMode();
    await loadHistory();
  };
  $("#cd-box-sent").onclick = async () => {
    state.phoneBox = "sent";
    renderMode();
    await loadHistory();
  };

  $("#cd-mirror").onclick = () => {
    state.mirrorPhoneToDesk = !state.mirrorPhoneToDesk;
    renderMode();
  };

  $("#cd-monitor-refresh").onclick = loadMonitor;
  $("#cd-monitor-search").oninput = renderMonitor;

  elAgent.onchange = () => {
    state.agentId = elAgent.value;
    renderAgentTabs();
  };

  $("#cd-phone-from").onchange = () => {
    state.phoneFrom = $("#cd-phone-from").value;
  };
  $("#cd-phone-to").onchange = async () => {
    state.phoneTo = $("#cd-phone-to").value;
    if (state.mode === "phone" && state.phoneBox === "inbox") await loadHistory();
  };

  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  loadAgents()
    .then(async () => {
      renderMode();
      await loadHistory();
    })
    .catch((err) => alert(`Company Desk init failed: ${err}`));
})();
