const TMI = require('tmi.js');
const Store = require('electron-store');
const config = new Store();

function createChatWindow() {
    let chatWindow = document.createElement('div');
    chatWindow.id = 'twitchChat';
    let chatList = document.getElementById('chatList');
    chatList.insertAdjacentElement('beforebegin', chatWindow);

    let style = document.createElement('style');
    style.innerHTML = `#twitchChat {
        overflow-y: hidden;
        overflow-y: auto;
        overflow-x: hidden;
        z-index: 999999;
        border-radius: 5px;
        background-color: rgba(0,0,0,.4);
        pointer-events: all;
        position: relative;
        direction: rtl;
        text-align: left;
        margin-bottom: 10px;
    }
    
    #twitchChat::-webkit-scrollbar-track {
        -webkit-box-shadow: unset;
        box-shadow: unset;
        border-radius: unset;
        background-color: rgba(0,0,0,.25)
    }
    
    #twitchChat::-webkit-scrollbar {
        width: 6px
    }
    
    #twitchChat::-webkit-scrollbar-thumb {
        border-radius: 2px;
        -webkit-box-shadow: unset;
        box-shadow: unset;
        border-color: #36393f
    }`;
    document.head.appendChild(style);

    new MutationObserver(_ => {
        chatWindow.style.cssText = chatList.style.cssText;
    }).observe(chatList, { attributes: ['style'] });

    return chatWindow;
}

function insertChatMessage(elem, message, author, color) {
    let msg = `<div data-tab="-1" id="chatMsg_20"><div class="chatItem" style="direction:ltr"><span style="color:${color}">${author}</span>: <span class="chatMsg">${message}</span></div><br></div>`;
    elem.insertAdjacentHTML('beforeend', msg);

    let toRemove = [...elem.children].slice(0, -50);
    toRemove.forEach(e => e.remove());
}

module.exports = () => {
    if(!config.get('twitch.channel') || !config.get('twitch.token')) return;
    let globalBadges;
    let channelBadges;

    const client = new TMI.Client({
        identity: {
            username: config.get('twitch.channel'),
            password: config.get('twitch.token')
        },
        channels: [config.get('twitch.channel')]
    });

    let chat = createChatWindow();

    client.connect();
    client.on('message', async (channel, tags, message, self) => {
        if(!channelBadges) {
            try {
                channelBadges = (await (await fetch(`https://badges.twitch.tv/v1/badges/channels/${tags['room-id']}/display`).catch(() => {})).json().catch(_ => {})).badge_sets || {};
            } catch {}
        }
        let author = '';
        for(let badge in tags.badges) {
            let b = channelBadges[badge] || globalBadges[badge];
            if(!b) continue;
            let version = b.versions[tags.badges[badge]];
            if(!version) continue;
            author += `<img style="padding-right:5px" src="${version.image_url_1x}" alt="${version.title}">`;
        }
        author += tags['display-name'];

        window.log(tags['emotes']);
        function parseEmotes(str) {
            let result = '';
            let emotes = tags['emotes'];
            for(let i = 0; i < str.length; i++) {
                let char = str[i];
                let emote = Object.keys(emotes || {}).find(e => emotes[e].some(r => r.split('-')[0] == i));
                if(emote) {
                    let emoteEnd = emotes[emote].find(r => r.split('-')[0] == i).split('-')[1];
                    let emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v1/${emote}/1.0`;
                    result += `<img src="${emoteUrl}" alt="${emote}" style="vertical-align:middle">`;
                    i = emoteEnd;
                } else {
                    result += char;
                }
            }
            return result;
        }

        insertChatMessage(chat, parseEmotes(message), author, tags.color || '#ca5a25');
    });
    client.on('connected', async _ => {
        try {
            globalBadges = (await (await fetch('https://badges.twitch.tv/v1/badges/global/display').catch(() => {})).json().catch(_ => {})).badge_sets || {};
        } catch {}
    });
};