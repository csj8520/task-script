"use strict";
/**
 * 云闪付
 * 脚本兼容: Node.js
 * cron 10 8,22 * * * task-ysf.js
 * new Env('云闪付')
 *
 * 环境变量
 * YSF_AUTH_DATAS
 * [{"usrId": "xxx", Authorization": "Bearer xxx", "Cookie": "usrId=xxx"}]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const got_1 = (0, tslib_1.__importDefault)(require("got"));
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const utils_1 = require("./utils");
const log = new utils_1.Log();
if (!process.env.YSF_AUTH_DATAS) {
    log.log('YSF_AUTH_DATAS 不存在');
    process.exit(0);
}
const ysfAuthDatas = JSON.parse(process.env.YSF_AUTH_DATAS);
const ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/sa-sdk-ios  (com.unionpay.chsp) (cordova 4.5.4) (updebug 0) (version 939) (UnionPay/1.0 CloudPay) (clientVersion 199) (language zh_CN) (upApplet single) (walletMode 00)`;
(async () => {
    log.log(`共有帐号 ${ysfAuthDatas.length} 个`);
    for (const [it, idx] of ysfAuthDatas.map((it, idx) => [it, idx])) {
        log.log(`\n开始处理账号 [${it.usrId}]`);
        const signIn = await got_1.default
            .post('https://youhui.95516.com/newsign/api/daily_sign_in', { headers: { Authorization: it.Authorization, 'User-Agent': ua } })
            .json();
        if ('signedIn' in signIn) {
            log.log(`今天是第${signIn.signInDays.current.days}天签到，今日已签到成功，目前已连续签到${signIn.signInDays.days}天🎉`);
        }
        else {
            log.log(`签到: 失败 ❌ 了呢`);
            console.log(signIn);
        }
        const getPointOnce = await got_1.default
            .post('https://cloudvip.95516.com/payMember/getPointOnce', {
            json: { usrId: it.usrId, cmd: '3008', h5Flag: '01' },
            headers: { Cookie: it.Cookie, 'User-Agent': ua }
        })
            .json();
        if (getPointOnce.respCd === '00') {
            log.log(`成功领取积分：${getPointOnce.data.allPoint}🎉`);
        }
        else {
            log.log(`领取积分：失败 ❌ 了呢`);
            console.log(getPointOnce);
        }
    }
    try {
        const { sendNotify } = await (0, utils_1.importModule)(path_1.default.resolve('./sendNotify.js'));
        await sendNotify('云闪付', log.logs.join('\n'));
    }
    catch (_) { }
})();
