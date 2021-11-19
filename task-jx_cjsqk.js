"use strict";
/**
 * 京喜超级省钱卡
 * 每周日执行
 * 脚本兼容: Node.js
 * cron 30 8,10 * * 0 task-jx_cjsqk.js
 * new Env('京喜超级省钱卡')
 *
 * 环境变量
 * JD_COOKIE           京东cookie
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const got_1 = (0, tslib_1.__importDefault)(require("got"));
const utils_1 = require("./utils");
const log = new utils_1.Log();
if (!process.env.JD_COOKIE) {
    log.log('JD_COOKIE 不存在');
    process.exit(0);
}
const DEBUG = process.env.DEBUG === 'true';
const cookies = process.env.JD_COOKIE.split('&');
const init = async ({ cookie, index }) => {
    const options = {
        headers: {
            Referer: 'https://st.jingxi.com/',
            Cookie: cookie
        }
    };
    const info = await got_1.default.get('https://m.jingxi.com/ppvip/ppvip_rights/VIPHomePage?sceneval=2', options).json();
    DEBUG && console.log('info: ', JSON.stringify(info));
    if (info.cardStatus.status !== 1)
        return log.log('您未开通超级省钱卡！');
    let userRights = await got_1.default.get('https://m.jingxi.com/ppvip/ppvip_rights/QueryUserRights?sceneval=2', options).json();
    DEBUG && console.log('userRights: ', JSON.stringify(userRights));
    // TODO: freeMenu 每日免费菜
    log.log(userRights.freeMenu.tips.noChanceTips);
    log.log('');
    // IGNORE: couponLife 生活特惠
    const isSunday = new Date().getDay() === 0;
    if (isSunday) {
        // couponLong 会员专享券
        log.log('周日自动领取会员专享券');
        log.log('');
        // .slice(1, 3)
        for (const quan of userRights.couponLong) {
            if (quan.status === '1')
                continue;
            const url = `https://m.jingxi.com/ppvip/ppvip_rights/GetVIPCoupon?token=${quan.token}&couponType=2&_stk=_t%2CcouponType%2Ctoken&sceneval=2`;
            const quanStatus = await got_1.default.get(url, options).json();
            DEBUG && console.log('quanStatus: ', quanStatus);
            log.log(`正在领取：${quan.couponText}，状态：${quanStatus.successSubTitle}`);
        }
        userRights = await got_1.default.get('https://m.jingxi.com/ppvip/ppvip_rights/QueryUserRights?sceneval=2', options).json();
        DEBUG && console.log('userRights: ', JSON.stringify(userRights));
    }
    const quansStatus = userRights.couponLong.map((it) => [
        it.kindText,
        it.couponText,
        it.couponName || `减${it.discount}元：`,
        it.status === '1' ? '已领取' : '未领取'
    ]);
    log.log('');
    log.table(quansStatus);
};
(async () => {
    try {
        log.log(`共有帐号 ${cookies.length} 个\n`);
        for (let index = 0; index < cookies.length; index++) {
            log.log(`开始处理第 [${index + 1}] 个帐号\n`);
            await init({ cookie: cookies[index], index });
            log.log('');
        }
    }
    catch (e) {
        log.log(e);
    }
    finally {
        const { sendNotify } = await (0, utils_1.importModule)(path_1.default.resolve('./sendNotify.js'), (0, utils_1.cdn)('https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js'), 'https://raw.githubusercontent.com/he1pu/JDHelp/main/sendNotify.js');
        await sendNotify('京喜超级省钱卡', log.logs.join('\n'));
    }
})();
