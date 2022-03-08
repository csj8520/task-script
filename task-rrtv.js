"use strict";
/**
 * 人人视频签到
 * 脚本兼容: Node.js
 * cron 0 8-12/2 * * * task-rrtv.js
 * new Env('人人视频签到')
 *
 * 环境变量
 * RRTV_TOKEN           人人视频token
 * RRTV_WATCH_DURATION  随机观影时间范围 默认 60-70
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const uuid_1 = require("uuid");
const got_1 = (0, tslib_1.__importDefault)(require("got"));
const utils_1 = require("./utils");
const log = new utils_1.Log();
const DEBUG = process.env.DEBUG === 'true';
if (!process.env.RRTV_TOKEN) {
    log.log('token 不存在');
    process.exit(0);
}
const clientVersion = '5.8.1';
const clientType = 'ios_rrtv_jsb';
const tokens = process.env.RRTV_TOKEN.split('&');
const deviceId = (0, uuid_1.v4)();
const watchDuration = (process.env.RRTV_WATCH_DURATION || '60-70').split('-');
const watchDurationMin = Number(watchDuration[0]);
const watchDurationMax = Number(watchDuration[1]);
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
    // 成就
    mission: {
        // 任务列表
        list: 'https://api.rr.tv/v3plus/mission/myMissionList',
        join: 'https://api.rr.tv/v3plus/mission/joinMission',
        click: 'https://api.rr.tv/v3plus/mission/initMyMissionClick'
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
const init = async ({ token, index }) => {
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NJVideo/1.3.1 (iPhone; iOS 15.0; Scale/3.00)',
            token,
            clientVersion,
            clientType,
            deviceId,
            aliId: token // 不可随机，会导致token失效
        },
        responseType: 'json',
        timeout: 60 * 1000
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
    const { body: userProfile } = await got_1.default.post(api.user.info, options);
    if (userProfile?.code !== '0000')
        return log.log(`获取帐号 [${index + 1}] 信息失败: ${userProfile?.msg}`);
    const { nickName, level, vipLevel, hasSignIn, isClock, id, medalList } = userProfile.data.user;
    const greatLord = medalList.find((it) => it.name === '大魔王');
    log.log(`开始处理账号 [${index + 1}] ${nickName}\n`);
    log.log(`帐号: ${nickName}, 等级: ${level}, VIP等级: ${vipLevel}`);
    greatLord && log.log(`大魔王有效期至: ${greatLord.endTime}`);
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
            openGifBox?.code === '0000' ? log.log(`打开礼盒获得: ${openGifBox.data.name}`) : log.log(`打开礼盒失败: ${openGifBox?.msg}`);
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
    const { body: missionList } = await got_1.default.post(api.mission.list, options);
    if (missionList?.code === '0000') {
        log.log(missionList.data.myMissionList.length ? '开始处理成就任务' : '暂无成就任务');
        log.log('');
        for (let it of missionList.data.myMissionList) {
            log.log(`${it.title} 成就 +${it.award} 经验 +${it.growth}`);
            if (it.title.includes('会员')) {
                log.log('会员任务暂时跳过');
                continue;
            }
            const { body: joinInfo } = await got_1.default.post(api.mission.join, { ...options, body: `missionId=${it.missionId}` });
            log.log(`领取任务: ${joinInfo?.code === '0000' ? '成功' : '失败'}`);
            if (DEBUG && joinInfo?.code !== '0000')
                log.log(joinInfo);
            const { body: clickInfo } = await got_1.default.post(api.mission.click, { ...options, body: `missionId=${it.missionId}&platform=ios` });
            log.log(`完成任务: ${clickInfo?.code === '0000' ? '成功' : '失败'}`);
            if (DEBUG && clickInfo?.code !== '0000')
                log.log(clickInfo);
        }
    }
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
            .filter((it) => it.content.includes('观看剧集') && now - new Date(it.createTimeStr).getTime() < todayPastTimes)
            .reduce((a, b) => a + b.score, 0);
        const maxExp = 180 * (Number.parseInt(addGrowth) / 100 + 1);
        const canWatch = maxExp > todayWatchScore + 1;
        if (canWatch) {
            await watchTv({ id });
            await (0, utils_1.delay)(15000);
        }
        else {
            log.log('今日经验已达到最大值取消随机观影');
        }
    }
    else {
        log.log(`获取经验记录失败: ${growthRecord?.msg}`);
    }
    log.log('');
    await (0, utils_1.delay)(1000);
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
        log.log(`共有帐号 ${tokens.length} 个\n`);
        for (let index = 0; index < tokens.length; index++) {
            await init({ token: tokens[index], index });
            log.log('');
        }
    }
    catch (e) {
        log.log(e);
    }
    finally {
        const { sendNotify } = await (0, utils_1.importModule)(path_1.default.resolve('./sendNotify.js'), (0, utils_1.cdn)('https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js'), 'https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js');
        await sendNotify('人人视频签到', log.logs.join('\n'));
    }
})();
