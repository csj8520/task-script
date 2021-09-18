/*
人人视频签到脚本
更新时间：2021-09-18
活动入口：13
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
================QuantumultX==================
[task_local]
#人人视频签到1
1 0,11,21 * * * jd_jump.js, tag=人人视频签到2, enabled=true
===================Loon==============
[Script]
cron "1 0,11,21 * * *" script-path=jd_jump.js, tag=人人视频签到3
===============Surge===============
[Script]
人人视频签到4 = type=cron,cronexp="1 0,11,21 * * *",wake-system=1,timeout=3600,script-path=jd_jump.js
====================================小火箭=============================
人人视频签到5 = type=cron,script-path=jd_jump.js, cronexpr="1 0,11,21 * * *", timeout=3600, enable=true
*/

/*
人人视频签到
只支持Node.js
脚本兼容: Node.js
cron 0 8-12/3 * * * task-rrtv.js

new Env('人人视频签到');
 */
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = require("got");
const uuid_1 = require("uuid");
const utils_1 = require("./utils");
const log = new utils_1.Log();
const clientVersion = '5.8.1';
const clientType = 'ios_rrtv_jsb';
const token = process.env.RRTV_TOKEN;
const deviceId = (0, uuid_1.v4)();
const watchDuration = (process.env.RRTV_WATCH_DURATION || '60-70').split('-');
const watchDurationMin = Number(watchDuration[0]);
const watchDurationMax = Number(watchDuration[1]);
const options = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NJVideo/1.3.1 (iPhone; iOS 15.0; Scale/3.00)',
        token,
        clientVersion,
        clientType,
        deviceId
    },
    responseType: 'json',
    timeout: 60 * 1000
};
const api = {
    host: 'https://api.rr.tv/',
    user: {
        info: 'https://api.rr.tv/user/profile'
    },
    level: {
        info: 'https://api.rr.tv/user/level/me',
        record: 'https://api.rr.tv/user/getGrowthRecord'
    },
    // 签到
    daily: {
        // 本周签到信息
        info: 'https://api.rr.tv/sign/getInfo',
        daily: 'https://api.rr.tv/sign/sign',
        // vip 签到
        vip: 'https://api.rr.tv/vip/experience/clock'
        // 未知
        // welfare: 'https://api.rr.tv/dailyWelfare/getWelfare'
    },
    // 签到->礼盒
    giftbox: {
        info: 'https://api.rr.tv/sign/getAllBagItemMaterial',
        open: 'https://api.rr.tv/sign/openBag'
    },
    // 成就->每日宝箱
    dailybox: {
        info: 'https://api.rr.tv/v3plus/taskCenter/index',
        open: 'https://api.rr.tv/v3plus/taskCenter/openBox'
    },
    // 我的背包
    mybag: {
        info: 'https://api.rr.tv/v3plus/taskCenter/myBag'
    },
    watchtv: {
        videoTopList: 'https://api.rr.tv/v3plus/season/topList',
        videoDetail: 'https://api.rr.tv/drama/app/get_combined_drama_detail',
        watch: 'https://api.rr.tv/constant/growthCallback'
    }
};
async function watchTv({ id }) {
    const { body: topList } = await got_1.default.post(api.watchtv.videoTopList, { ...options, body: 'area=USK&page=1&range=T-1' });
    if (topList?.code !== '0000')
        return log.log(`获取剧集失败: ${topList?.msg}`);
    const { id: seasonId, title } = (0, utils_1.random)(topList.data.results);
    const query = `?episodeSid=&isAgeLimit=0&isRecByUser=1&quality=OD&seasonId=${seasonId}&subtitle=3`;
    const { body: videoDetial } = await got_1.default.get(`${api.watchtv.videoDetail}${query}`, options);
    if (videoDetial?.code !== '0000')
        return log.log(`获取视频详情失败: ${videoDetial?.msg}`);
    const { sid, episodeNo } = (0, utils_1.random)(videoDetial.data.episodeList.episodeList);
    const playDuration = (0, utils_1.random)(watchDurationMin * 60, watchDurationMax * 60);
    log.log(`开始随机观影：${title} 第${episodeNo}集 时长${Math.floor(playDuration / 60)}:${playDuration % 60}`);
    const body = `growthStr=${encodeURIComponent(JSON.stringify({
        growthRecordDtos: [
            {
                userId: id,
                clientVersion,
                deviceId,
                playDuration,
                clientType,
                // objId: '25789',
                // objId: '223323',
                objId: sid,
                type: 'season',
                playTime: Math.round(new Date().getTime() / 1000)
            }
        ]
    }))}`;
    const { body: watch } = await got_1.default.post(api.watchtv.watch, { ...options, body });
    watch?.code === '0000' ? log.log('随机观影成功') : log.log(`随机观影失败: ${watch?.msg}`);
}
const init = async () => {
    const { body: userProfile } = await got_1.default.post(api.user.info, options);
    if (userProfile?.code !== '0000')
        return log.log(`获取帐号信息失败: ${userProfile?.msg}`);
    const { nickName, level, vipLevel, hasSignIn, isClock, id } = userProfile.data.user;
    log.log(`帐号: ${nickName}, 等级: ${level}, VIP等级: ${vipLevel}`);
    if (hasSignIn) {
        log.log('今日已签到过');
    }
    else {
        const { body } = await got_1.default.post(api.daily.daily, options);
        body?.code === '0000' ? log.log(`今日签到成功`) : log.log(`今日签到失败: ${body?.msg}`);
    }
    if (isClock) {
        log.log('今日VIP已打卡过');
    }
    else {
        const { body } = await got_1.default.post(api.daily.vip, options);
        body?.code === '0000' ? log.log(`VIP打卡成功`) : log.log(`VIP打卡失败: ${body?.msg}`);
    }
    log.log('');
    await (0, utils_1.delay)(1000);
    const { body: weekDailyInfo } = await got_1.default.post(api.daily.info, options);
    if (weekDailyInfo?.code === '0000') {
        const { signDetailList, isOpenBag, canOpenBag } = weekDailyInfo.data;
        log.log(`已签到: 周${signDetailList
            .reverse()
            .map((it) => it.weekNum)
            .join(', 周')}`);
        if (isOpenBag) {
            log.log('礼盒已打开过');
        }
        else if (canOpenBag) {
            const { body } = await got_1.default.post(api.giftbox.info, options);
            body?.code === '0000'
                ? log.log(`礼盒内容如下: ${body.data.map((it) => it.text1 + it.text2).join(',')}`)
                : log.log(`获取礼盒内容失败: ${body?.msg}`);
            const { body: openGifBox } = await got_1.default.post(api.giftbox.open, options);
            openGifBox?.code === '0000' ? log.log(`打开礼盒获得: ${body.data.name}`) : log.log(`打开礼盒失败: ${openGifBox?.msg}`);
        }
        else {
            log.log('不满足打开礼盒条件');
        }
    }
    else {
        log.log(`获取签到信息失败: ${weekDailyInfo?.msg}`);
    }
    log.log('');
    await (0, utils_1.delay)(1000);
    const { body: dailyBox } = await got_1.default.post(api.dailybox.info, options);
    for (const box of dailyBox.data.box) {
        if (box.status === 1) {
            log.log(`宝箱 [${box.name}] 已打开`);
        }
        else if (dailyBox.data.activePoint >= box.activePoint) {
            const { body: openBox } = await got_1.default.post(api.dailybox.open, { ...options, body: `boxId=${box.id}` });
            openBox?.code === '0000'
                ? log.log(`宝箱 [${box.name}] 打开成功获得: ${openBox.data.boxs.map((it) => `${it.rewardName}x${it.rewardNum}`).join(', ')}`)
                : log.log(`宝箱 [${box.name}] 打开失败: ${openBox?.msg}`);
        }
        else {
            log.log(`宝箱 [${box.name}] 活跃值不足`);
        }
    }
    log.log('');
    await (0, utils_1.delay)(1000);
    const { body: myBag } = await got_1.default.post(api.mybag.info, options);
    if (myBag?.code === '0000') {
        log.log('背包里有: ');
        log.log(`成就值: x${myBag.data.currency.achievement}`);
        log.log(`${myBag.data.bag.map((it) => `${it.name}: x${it.number}`).join(' \n')}`);
    }
    else {
        log.log(`获取背包信息失败: ${myBag?.msg}`);
    }
    log.log('');
    await (0, utils_1.delay)(1000);
    const { body: growthRecord } = await got_1.default.post(api.level.record, options);
    if (growthRecord?.code === '0000') {
        const { body: levelInfo } = await got_1.default.post(api.level.info, options);
        const { todayScore, addGrowth } = levelInfo.data;
        const now = Date.now();
        const todayPastTimes = now - new Date(now).setHours(0, 0, 0, 0);
        const todayWatchScore = growthRecord.data.results
            .filter((it) => it.id > 0 && now - new Date(it.createTimeStr).getTime() < todayPastTimes)
            .reduce((a, b) => a + b.score, 0);
        const canWatch = 180 * (Number.parseInt(addGrowth) / 100 + 1) >= todayWatchScore;
        if (canWatch) {
            await watchTv({ id });
        }
        else {
            log.log('今日经验已超出最大值取消随机观影');
        }
    }
    else {
        log.log(`获取经验记录失败: ${growthRecord?.msg}`);
    }
    log.log('');
    await (0, utils_1.delay)(10000);
    const { body: levelInfo } = await got_1.default.post(api.level.info, options);
    if (levelInfo?.code === '0000') {
        const { currentLevel, nextLevelNeedScore, addGrowth, todayScore } = levelInfo.data;
        log.log(`当前等级: ${currentLevel}, 升级还需: ${nextLevelNeedScore}, 勋章加成: ${addGrowth}, 今日获得经验: ${todayScore}`);
    }
    else {
        log.log(`获取等级信息失败: ${levelInfo?.msg}`);
    }
};
(async () => {
    try {
        await init();
    }
    catch (e) {
        log.log(e);
    }
    finally {
        const { sendNotify } = await (0, utils_1.importModule)('./sendNotify.js', (0, utils_1.cdn)('https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js'), 'https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js');
        await sendNotify('人人视频签到', log.logs.join('\n'));
    }
})();
