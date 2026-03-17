export default {
  async fetch(request) {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Messenger Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            body { background-color: #000; color: white; overflow: hidden; }
            .glass { background: rgba(20, 20, 20, 0.8); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.05); }
            
            /* Messenger Style Video Grid */
            #video-grid { 
                display: grid; 
                gap: 8px; 
                padding: 8px;
                height: 100%;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                align-content: center;
            }
            /* Jika hanya 1 user, buat full screen */
            #video-grid:has(> :last-child:nth-child(1)) { grid-template-columns: 1fr; }
            /* Jika 2 user, bagi dua rata */
            #video-grid:has(> :last-child:nth-child(2)) { grid-template-columns: 1fr 1fr; }

            .video-card { 
                position: relative; 
                border-radius: 20px; 
                overflow: hidden; 
                background: #111;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                aspect-ratio: 3/4;
            }
            video { width: 100%; height: 100%; object-fit: cover; }
            .self-view { transform: scaleX(-1); }

            /* Overlay Name Messenger Style */
            .user-label {
                position: absolute;
                bottom: 12px;
                left: 12px;
                background: rgba(0,0,0,0.4);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                backdrop-filter: blur(5px);
            }

            /* Messenger Chat Sidebar/Overlay */
            #chat-panel {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 100%;
                max-width: 350px;
                z-index: 50;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #chat-panel.open { transform: translateX(0); }

            .msg { padding: 8px 14px; border-radius: 18px; margin-bottom: 4px; max-width: 80%; font-size: 13px; }
            .msg-me { background: #0084ff; align-self: flex-end; color: white; }
            .msg-them { background: #333; align-self: flex-start; color: white; }

            /* Bottom Controls */
            .controls-bar {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
                z-index: 40;
            }
            .ctrl-btn { 
                width: 50px; height: 50px; 
                border-radius: 25px; 
                display: flex; items-center; justify-center;
                background: rgba(40, 40, 40, 0.9);
                transition: all 0.2s;
            }
            .ctrl-btn:active { transform: scale(0.9); }
            .ctrl-btn.active { background: #ff3b30; }
            .ctrl-btn.primary { background: #0084ff; }
        </style>
    </head>
    <body class="flex flex-col h-screen">

        <div id="auth-ui" class="flex items-center justify-center h-screen p-4 z-[100] bg-black">
            <div class="w-full max-w-xs text-center">
                <div class="mb-8 flex justify-center">
                    <div class="w-20 h-20 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl rotate-12 flex items-center justify-center">
                        <i data-lucide="messages-square" class="w-10 h-10 text-white -rotate-12"></i>
                    </div>
                </div>
                <h1 class="text-2xl font-black mb-8">Messenger Pro</h1>
                <div class="space-y-2 mb-6 text-left">
                    <input id="user" type="text" placeholder="Username" class="w-full p-4 rounded-2xl bg-[#111] border border-white/5 outline-none focus:border-blue-500">
                    <input id="pass" type="password" placeholder="Password" class="w-full p-4 rounded-2xl bg-[#111] border border-white/5 outline-none focus:border-blue-500">
                    <input id="room" type="text" placeholder="Room Name" class="w-full p-4 rounded-2xl bg-[#111] border border-white/5 outline-none focus:border-blue-500">
                </div>
                <button onclick="handleAuth('login', 'video')" class="w-full bg-blue-600 p-4 rounded-2xl font-bold mb-2">Video Call</button>
                <button onclick="handleAuth('login', 'voice')" class="w-full bg-[#222] p-4 rounded-2xl font-bold">Voice Call</button>
            </div>
        </div>

        <div id="main-ui" class="hidden flex-1 relative flex flex-col">
            <header class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 pointer-events-none">
                <div class="pointer-events-auto bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                    <span id="room-id" class="text-xs font-bold text-blue-400 tracking-wider"></span>
                </div>
                <div class="flex gap-2 pointer-events-auto">
                    <button onclick="toggleChat()" class="w-10 h-10 glass rounded-full flex items-center justify-center relative">
                        <i data-lucide="message-circle" class="w-5 h-5"></i>
                        <span id="notif-chat" class="hidden absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></span>
                    </button>
                    <button onclick="logout()" class="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </header>

            <div id="video-grid" class="flex-1"></div>

            <div id="chat-panel" class="glass">
                <div class="flex flex-col h-full">
                    <div class="p-4 border-b border-white/5 flex justify-between items-center">
                        <h2 class="font-bold text-sm">Obrolan Room</h2>
                        <button onclick="toggleChat()"><i data-lucide="chevron-right"></i></button>
                    </div>
                    <div id="chat-msgs" class="flex-1 overflow-y-auto p-4 flex flex-col"></div>
                    <div id="file-preview" class="hidden p-2 bg-blue-600/10 flex justify-between text-[10px] px-4">
                        <span id="file-name" class="truncate"></span>
                        <button onclick="cancelFile()" class="text-red-500">BATAL</button>
                    </div>
                    <div class="p-4 bg-black flex items-center gap-2">
                        <button onclick="document.getElementById('file-input').click()"><i data-lucide="plus-circle" class="w-6 h-6 text-blue-500"></i></button>
                        <input type="file" id="file-input" class="hidden" onchange="handleFileSelect(this)">
                        <input id="chat-input" type="text" placeholder="Aa" class="flex-1 bg-[#222] py-2 px-4 rounded-full text-sm outline-none">
                        <button id="vn-btn" onmousedown="startVN()" onmouseup="stopVN()" ontouchstart="startVN()" ontouchend="stopVN()"><i data-lucide="mic" class="w-6 h-6 text-blue-500"></i></button>
                        <button onclick="sendChat()"><i data-lucide="send-horizontal" class="w-6 h-6 text-blue-500"></i></button>
                    </div>
                </div>
            </div>

            <div class="controls-bar">
                <button onclick="toggleAudio()" id="btn-mic" class="ctrl-btn"><i data-lucide="mic"></i></button>
                <button onclick="toggleVideo()" id="btn-vid" class="ctrl-btn"><i data-lucide="video"></i></button>
                <button onclick="flipCamera()" class="ctrl-btn"><i data-lucide="refresh-cw"></i></button>
                <button onclick="shareScreen()" class="ctrl-btn primary"><i data-lucide="monitor-up"></i></button>
            </div>
        </div>

        <script>
            lucide.createIcons();
            const BACKEND = "https://api.darkdocker.qzz.io"; 
            let myID, myRoom, socket, localStream, callMode = 'video', mediaRecorder, audioChunks = [], selectedFile = null;
            let peers = {};

            // Tambahkan logika WebRTC & WS dari file sebelumnya di sini...
            // (Logika initCall, setupPeer, renderVideo harus disesuaikan sedikit)

            function renderVideo(id, stream, isSelf) {
                if(document.getElementById('cont-'+id)) return;
                const hasVideo = stream.getVideoTracks().length > 0;
                const div = document.createElement('div');
                div.id = 'cont-' + id;
                div.className = \`video-card \${!hasVideo ? 'voice-mode' : ''}\`;
                div.innerHTML = \`
                    <video id="vid-\${id}" autoplay playsinline \${isSelf ? 'muted' : ''} class="\${isSelf ? 'self-view' : ''}"></video>
                    <div class="avatar-call hidden flex items-center justify-center w-full h-full bg-[#111]">
                        <div class="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">\${id[0].toUpperCase()}</div>
                    </div>
                    <div class="user-label">
                        <div class="flex items-center gap-2">
                             <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                             \${id} \${isSelf ? '(Anda)' : ''}
                        </div>
                    </div>\`;
                document.getElementById('video-grid').appendChild(div);
                document.getElementById('vid-'+id).srcObject = stream;
                if(!hasVideo) div.querySelector('.avatar-call').classList.remove('hidden');
                lucide.createIcons();
            }

            function toggleChat() {
                document.getElementById('chat-panel').classList.toggle('open');
                document.getElementById('notif-chat').classList.add('hidden');
            }

            // ... Lanjutkan fungsi sendChat, handleAuth, dan WebRTC lainnya seperti di file sebelumnya ...
        </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}
