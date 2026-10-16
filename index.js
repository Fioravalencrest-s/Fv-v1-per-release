const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { pairingNumber, paths } = require('./core/config');
const { route } = require('./core/router');
const { start } = require('./core/scheduler');

let reconnectTimer = null;
let starting = false;

async function startBot() {
  if (starting) return;
  starting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(paths.session);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingRequested = state.creds.registered;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'connecting') {
        console.log('🥏 Connecting to WhatsApp...');
      }

      if (
        connection === 'open' &&
        !state.creds.registered
      ) {
        console.log('⚠️ Connection opened before credentials were registered.');
      }

      if (
        !state.creds.registered &&
        !pairingRequested &&
        pairingNumber
      ) {
        pairingRequested = true;

        try {
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('📱 Requesting pairing code...');

          const code = await sock.requestPairingCode(pairingNumber);

          console.log('\n==============================');
          console.log('🔐 PAIRING CODE:', code);
          console.log('==============================\n');
        } catch (err) {
          pairingRequested = false;
          console.error('❌ Pairing error:', err?.message || err);
        }
      }

      if (connection === 'open') {
        starting = false;
        console.log('✅ Fiora V2 connected');

        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        try {
          await start(sock);
        } catch (err) {
          console.error('Scheduler error:', err?.message || err);
        }
      }

      if (connection === 'close') {
        starting = false;

        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('❌ Connection closed:', code || 'unknown');

        if (code === DisconnectReason.loggedOut) {
          console.log('🚪 WhatsApp session logged out. Delete/rename the session and pair again.');
          return;
        }

        if (!reconnectTimer) {
          console.log('🔄 Reconnecting in 10 seconds...');
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            startBot().catch(err => console.error('Reconnect error:', err));
          }, 10000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          await route(sock, msg);
        } catch (err) {
          console.error('Message error:', err?.message || err);
        }
      }
    });
  } catch (err) {
    starting = false;
    console.error('❌ Fatal startup error:', err?.message || err);

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startBot().catch(console.error);
      }, 10000);
    }
  }
}

startBot().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
