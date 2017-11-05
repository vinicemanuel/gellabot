const TelegramBot = require('node-telegram-bot-api');
const token = '490999114:AAHpHX6ocRcofORuupSpAZrS2OWkd5dYxNY';

const bot = new TelegramBot(token, {polling: true});
const telegramTopic = 'gellabot_telegram'
const raspTopic = 'gellabot_rasp'

var chatID = null
var raspData = null
var _escolhaBebida = true
var _ready = true

function startFunctio(msg){
    chatID = msg.chat.id
    bot.sendMessage(msg.chat.id, "Tudo certo, você será avisado quando sua bebida estiver no ponto", {"reply_markup": {
        "keyboard": [["ver temperatura atual"], ["ver tempo que resta"], ["trocar bebida"]]
        }
    })
};

bot.onText(/\/start/, (msg) => {
    chatID = msg.chat.id
    bot.sendMessage(msg.chat.id, "bem vindo", {"reply_markup": {
        "keyboard": [["ver temperatura atual"], ["ver tempo que resta"], ["escolher bebida"]]
        }
    })
});

bot.on('message', (msg) => {
    var text = msg.text.toLowerCase()

    if (text == "ver temperatura atual"){
        temperature(msg)
    }else if (text == "ver tempo que resta"){
        time(msg)
    }else if (text == "escolher bebida" || text == "trocar bebida"){
        bot.sendMessage(msg.chat.id, "Escolha a bebida", {"reply_markup": {
            "keyboard": [["cerveja"], ["vinho"], ["cancelar"]]
            }
        })
    }

    else if ((text == "cancelar")){
        bot.sendMessage(msg.chat.id, "bem vindo", {"reply_markup": {
            "keyboard": [["ver temperatura atual"], ["ver tempo que resta"], ["escolher bebida"]]
            }
        })
    }else{
        sendData(text)
        if (raspData){
            if (raspData.drink_on){
                startFunctio(msg)
            }else{
                bot.sendMessage(msg.chat.id, "coloque uma bebida")
            }    
        }
    }
    
});

function temperature(msg){
    if (raspData != null){
        bot.sendMessage(msg.chat.id, "temperatura atual é: " + raspData.temperature + "ºC")
    }else{
        bot.sendMessage(msg.chat.id, "device ainda não conectado")
    }
}

function time(msg){
    if (raspData != null){
        if (raspData.drink != 'null'){
            var leftTime = raspData.time
            if (leftTime <= 1){
                bot.sendMessage(msg.chat.id, "Sua bebida estara pronta já já")
            }
            else{
                bot.sendMessage(msg.chat.id, "Sua bebida estará pronta em mais ou menos " + leftTime + " minutos")
            }
        }else{
            bot.sendMessage(msg.chat.id, "Bebida ainda não escolhida", {"reply_markup": {
                "keyboard": [["cerveja"], ["vinho"], ["cancelar"]]
                }
            })
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
    console.log(raspData)
    if (raspData.ready){
        if (chatID == false){
            if (_ready){
                bot.sendMessage(chatID, "Bora beber carai!!")
                _ready = !_ready
            }
        }
    }

    if (raspData.drink_on){
        if (raspData.drink == 'null'){
            if (chatID && _escolhaBebida){
                _escolhaBebida = !_escolhaBebida
                bot.sendMessage(chatID, "Escolha a bebida", {"reply_markup": {
                    "keyboard": [["cerveja"], ["vinho"], ["cancelar"]]
                    }
                })
            }
        }
    } 
})

function sendData(data){
    client.publish(telegramTopic, data)
}
