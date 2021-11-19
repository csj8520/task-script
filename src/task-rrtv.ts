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

import path from 'path';
import { v4 as uuid } from 'uuid';
import got, { OptionsOfJSONResponseBody } from 'got';
import { Log, random, delay, importModule, cdn } from './utils';

const log = new Log();

if (!process.env.RRTV_TOKEN) {
  log.log('token 不存在');
  process.exit(0);
}

const clientVersion = '5.8.1';
const clientType = 'ios_rrtv_jsb';
const tokens = process.env.RRTV_TOKEN!.split('&');
const deviceId = uuid();

const watchDuration = (process.env.RRTV_WATCH_DURATION || '60-70').split('-');
const watchDurationMin = Number(watchDuration[0]);
const watchDurationMax = Number(watchDuration[1]);

interface ResType<T = any> {
  requestId: string;
  code: string;
  msg: string;
  data: T;
}

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

const init = async ({ token, index }: { token: string; index: number }) => {
  const options: OptionsOfJSONResponseBody = {
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
  async function watchTv({ id }: { id: number }) {
    const { body: topList } = await got.post<ResType>(api.watchtv.videoTopList, { ...options, body: 'area=USK&page=1&range=T-1' });
    if (topList?.code !== '0000') return log.log(`获取剧集失败: ${topList?.msg}`);
    const { id: seasonId, title } = random(topList.data.results as any[]);

    const query = `?episodeSid=&isAgeLimit=0&isRecByUser=1&quality=OD&seasonId=${seasonId}&subtitle=3`;
    const { body: videoDetial } = await got.get<ResType>(`${api.watchtv.videoDetail}${query}`, options);
    if (videoDetial?.code !== '0000') return log.log(`获取视频详情失败: ${videoDetial?.msg}`);

    const { sid, episodeNo } = random(videoDetial.data.episodeList.episodeList as any[]);
    const playDuration = random(watchDurationMin * 60, watchDurationMax * 60);

    log.log(`开始随机观影：${title} 第${episodeNo}集 时长${Math.floor(playDuration / 60)}:${playDuration % 60}`);

    const body = `growthStr=${encodeURIComponent(
      JSON.stringify({
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
      })
    )}`;
    const { body: watch } = await got.post<ResType>(api.watchtv.watch, { ...options, body });
    watch?.code === '0000' ? log.log('随机观影成功') : log.log(`随机观影失败: ${watch?.msg}`);
  }

  const { body: userProfile } = await got.post<ResType>(api.user.info, options);
  if (userProfile?.code !== '0000') return log.log(`获取帐号 [${index + 1}] 信息失败: ${userProfile?.msg}`);
  const { nickName, level, vipLevel, hasSignIn, isClock, id } = userProfile.data.user;

  log.log(`开始处理账号 [${index + 1}] ${nickName}\n`);

  log.log(`帐号: ${nickName}, 等级: ${level}, VIP等级: ${vipLevel}`);

  if (hasSignIn) {
    log.log('今日已签到过');
  } else {
    const { body } = await got.post<ResType>(api.daily.daily, options);
    body?.code === '0000' ? log.log(`今日签到成功`) : log.log(`今日签到失败: ${body?.msg}`);
  }

  if (isClock) {
    log.log('今日VIP已打卡过');
  } else {
    const { body } = await got.post<ResType>(api.daily.vip, options);
    body?.code === '0000' ? log.log(`VIP打卡成功`) : log.log(`VIP打卡失败: ${body?.msg}`);
  }

  log.log('');
  await delay(1000);

  const { body: weekDailyInfo } = await got.post<ResType>(api.daily.info, options);
  if (weekDailyInfo?.code === '0000') {
    const { signDetailList, isOpenBag, canOpenBag } = weekDailyInfo.data;
    log.log(
      `已签到: 周${signDetailList
        .reverse()
        .map((it: any) => it.weekNum)
        .join(', 周')}`
    );
    if (isOpenBag) {
      log.log('礼盒已打开过');
    } else if (canOpenBag) {
      const { body } = await got.post<ResType>(api.giftbox.info, options);
      body?.code === '0000'
        ? log.log(`礼盒内容如下: ${body.data.map((it: any) => it.text1 + it.text2).join(',')}`)
        : log.log(`获取礼盒内容失败: ${body?.msg}`);

      const { body: openGifBox } = await got.post<ResType>(api.giftbox.open, options);
      openGifBox?.code === '0000' ? log.log(`打开礼盒获得: ${openGifBox.data.name}`) : log.log(`打开礼盒失败: ${openGifBox?.msg}`);
    } else {
      log.log('不满足打开礼盒条件');
    }
  } else {
    log.log(`获取签到信息失败: ${weekDailyInfo?.msg}`);
  }

  log.log('');
  await delay(1000);

  const { body: dailyBox } = await got.post<ResType>(api.dailybox.info, options);
  for (const box of dailyBox.data.box) {
    if (box.status === 1) {
      log.log(`宝箱 [${box.name}] 已打开`);
    } else if (dailyBox.data.activePoint >= box.activePoint) {
      const { body: openBox } = await got.post<ResType>(api.dailybox.open, { ...options, body: `boxId=${box.id}` });
      openBox?.code === '0000'
        ? log.log(`宝箱 [${box.name}] 打开成功获得: ${openBox.data.boxs.map((it: any) => `${it.rewardName}x${it.rewardNum}`).join(', ')}`)
        : log.log(`宝箱 [${box.name}] 打开失败: ${openBox?.msg}`);
    } else {
      log.log(`宝箱 [${box.name}] 活跃值不足`);
    }
  }

  log.log('');
  await delay(1000);

  const { body: myBag } = await got.post<ResType>(api.mybag.info, options);
  if (myBag?.code === '0000') {
    log.log('背包里有: ');
    log.log(`成就值: x${myBag.data.currency.achievement}`);
    log.log(`${myBag.data.bag.map((it: any) => `${it.name}: x${it.number}`).join(' \n')}`);
  } else {
    log.log(`获取背包信息失败: ${myBag?.msg}`);
  }

  log.log('');
  await delay(1000);

  const { body: growthRecord } = await got.post<ResType>(api.level.record, options);
  if (growthRecord?.code === '0000') {
    const { body: levelInfo } = await got.post<ResType>(api.level.info, options);
    const { todayScore, addGrowth } = levelInfo.data;
    const now = Date.now();
    const todayPastTimes = now - new Date(now).setHours(0, 0, 0, 0);
    const todayWatchScore = growthRecord.data.results
      .filter((it: any) => it.content.includes('观看剧集') && now - new Date(it.createTimeStr).getTime() < todayPastTimes)
      .reduce((a: number, b: any) => a + b.score, 0);

    const maxExp = 180 * (Number.parseInt(addGrowth) / 100 + 1);
    const canWatch = maxExp > todayWatchScore + 1;

    if (canWatch) {
      await watchTv({ id });
      await delay(15000);
    } else {
      log.log('今日经验已达到最大值取消随机观影');
    }
  } else {
    log.log(`获取经验记录失败: ${growthRecord?.msg}`);
  }

  log.log('');
  await delay(1000);
  const { body: levelInfo } = await got.post<ResType>(api.level.info, options);
  if (levelInfo?.code === '0000') {
    const { currentLevel, nextLevelNeedScore, addGrowth, todayScore } = levelInfo.data;
    log.log(`当前等级: ${currentLevel}, 升级还需: ${nextLevelNeedScore}, 勋章加成: ${addGrowth}, 今日获得经验: ${todayScore}`);
  } else {
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
  } catch (e) {
    log.log(e);
  } finally {
    const { sendNotify } = await importModule(
      path.resolve('./sendNotify.js'),
      cdn('https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js'),
      'https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js'
    );
    await sendNotify('人人视频签到', log.logs.join('\n'));
  }
})();
