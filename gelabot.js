const TelegramBot = require('node-telegram-bot-api');
const token = '490999114:AAHpHX6ocRcofORuupSpAZrS2OWkd5dYxNY';

const bot = new TelegramBot(token, {polling: true});
const telegramTopic = 'gellabot_telegram'
const raspTopic = 'gellabot_rasp'

var chatID = null
var raspData = null

function startFunctio(msg){
    chatID = msg.chat.id
    bot.sendMessage(msg.chat.id, "bem vindo", {"reply_markup": {
        "keyboard": [/*["escolher temperatura ideal"],*/["ver temperatura atual"], ["ver tempo que resta"], ["escolher bebida"]]
        }
    })
};

bot.onText(/\/start/, (msg) => {
    startFunctio(msg)
});

bot.on('message', (msg) => {
    if (msg.text == "ver temperatura atual"){
        temperature(msg)
    }else if (msg.text == "ver tempo que resta"){
        time(msg)
    }else if (msg.text == "escolher bebida"){
        bot.sendMessage(msg.chat.id, "Escolha a bebida", {"reply_markup": {
            "keyboard": [["cerveja"], ["vinho"], ["cancelar"]]
            }
        })
    }

    else if ((msg.text == "cancelar")){
        startFunctio(msg)
    }else{
        sendData(msg.text)
        startFunctio(msg)
    }
    
});

function temperature(msg){
    if (raspData != null){
        if (raspData.drink != 'null'){
            bot.sendMessage(msg.chat.id, "temperatura atual é: " + raspData.temperature + "ºC")
        }else{
            bot.sendMessage(msg.chat.id, "Bebida ainda não escolhida")
        }
    }else{
        bot.sendMessage(msg.chat.id, "device ainda não conectado")
    }
}

function time(msg){
    if (raspData != null){
        if (raspData.drink != 'null'){
            var leftTime = raspData.time / 60000
            if (leftTime < 0){
                bot.sendMessage(msg.chat.id, "sua bebida estara pronta já já")
            }else{
                bot.sendMessage(msg.chat.id, "sua bebida estara pronta em mais ou menos " + leftTime + " segundos")
            }
        }else{
            bot.sendMessage(msg.chat.id, "Bebida ainda não escolhida")
        }
    }else{
        bot.sendMessage(msg.chat.id, "device ainda não conectado")
    }
}

const mqtt = require('mqtt')
const client = mqtt.connect("mqtt://broker.hivemq.com")

client.on('connect', () => {
    console.log('connected')
    client.subscribe(raspTopic)
})

client.on('message', (topic, message) => {
    var stringJson = message.toString('utf8')
    raspData = JSON.parse(stringJson)
    if (raspData.ready){
        if (chatID){
            bot.sendMessage(chatID, "Bora beber carai!!")
        }
    }
})

function sendData(data){
    client.publish(telegramTopic, data)
}
