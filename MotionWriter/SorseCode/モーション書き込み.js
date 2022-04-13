function Loading () {
    nowTime = input.runningTime()
    if (nowTime - lastUpdate < 250) {
        return -1
    }
    lastUpdate = nowTime
    if (loadFlag % 4 == 0) {
        basic.showLeds(`
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            `, 0)
    } else if (loadFlag % 4 == 1) {
        basic.showLeds(`
            . . . . .
            . . . . .
            # . . . .
            . . . . .
            . . . . .
            `, 0)
    } else if (loadFlag % 4 == 2) {
        basic.showLeds(`
            . . . . .
            . . . . .
            # . # . .
            . . . . .
            . . . . .
            `, 0)
    } else {
        basic.showLeds(`
            . . . . .
            . . . . .
            # . # . #
            . . . . .
            . . . . .
            `, 0)
    }
    loadFlag += 1
    return 0
}
let loadFlag = 0
let lastUpdate = 0
let nowTime = 0
let errorCheck = 0
let errorFlag = false
let sendId = 0
let startFlag = false
function GetData(a = true) { // シリアル通信からデータを取得する
    let result: string
    sendId += 1

    while (true) {
        let data = SerialRead()
        if (data) {
            let dataArry = data.split('|')
            if (dataArry.length == 2) {
                let getSendID = parseInt(dataArry[0])
                let getValue = dataArry[1]

                if(startFlag){
                    // データ受信
                    if (getValue == "Start" && getSendID　== 1 && sendId > 2) {
                        // 受信中断
                        result = 'Error'
                        break
                    }

                    if (sendId == getSendID) {
                        led.toggle(0, 0)
                        result = getValue
                        serial.writeLine('S')
                        break
                    }
                }else{
                    // 初回受信
                    if (getValue == "Start" && sendId == 1) {
                        // 受信開始
                        startFlag = true
                        result = getValue
                        basic.showIcon(IconNames.Diamond)
                        break
                    }
                }
            }
        }

        let checksum = 0
        let sendIDstr = sendId.toString()
        for (let i of sendIDstr) checksum += parseInt(i)

        serial.writeLine('Fail[' + sendIDstr + ']' + checksum)
    }

    return result
}
function SerialRead(a = true) {
    let getData = SerialReadUntil('\n')

    // [データ]チェックサム
    if (getData[0] != '[') return false
    getData = getData.slice(1)
    let getDataArray = getData.split(']')
    if (getDataArray.length != 2) return false

    // checksum
    let buffer = Buffer.fromUTF8(getDataArray[0])
    let checksum2 = 0
    for (let j = 0; j < buffer.length; j++) checksum2 += buffer[j]
    if (parseInt(getDataArray[1]) != checksum2) return false

    return getDataArray[0]
}
function SerialReadUntil(limit: string, timeout = 100) {
    let data2 = ''
    let lastReadTime = input.runningTime()
    while (true) {
        Loading()
        data2 += serial.readString()
        let dataArray = data2.split(limit)

        if (dataArray.length > 1) {
            return dataArray[0]
        }

        if (lastReadTime - input.runningTime() > timeout) return '' // タイムアウト
    }
}
function EEPWrite(address: number, rom2 = true) {
    let dataArray2 = []
    while (true) {
        let data3 = GetData()
        if (data3 == 'Complete') break
        if (data3 == 'Error') {
            errorFlag = true
            break
        }
        dataArray2.push(parseInt(data3))
        let len = dataArray2.length
        if (len >= 256) {
            plenbit_full.WriteEEPROM(address, dataArray2, rom2)
            dataArray2.splice(0, dataArray2.length)
            address += len
        }
    }
    plenbit_full.WriteEEPROM(address, dataArray2, true)
}
while (true) {
    let data4 = GetData()
if (data4 == "VerWrite") {
        errorCheck += 1
        // バージョン情報書き込み
        basic.showString("V")
        EEPWrite(0)
    } else if (data4 == "FlameWrite") {
        errorCheck += 1
        // フレーム情報書き込み
        basic.showString("F")
        EEPWrite(256)
    } else if (data4 == "MotionWrite") {
        errorCheck += 1
        // モーション書き込み
        basic.showString("M")
        EEPWrite(512)
    } else if (data4 == "AllComplete") {
        if (errorCheck == 3) {
            basic.showIcon(IconNames.Yes)
        } else {
            basic.showIcon(IconNames.No)
        }
        break;
    } else if (data4 == "Error") {
        errorFlag = true
    }
    if (errorFlag) {
        serial.writeLine("E")
        basic.showIcon(IconNames.No)
        break;
    }
}
