/** @format */

import ROOT_PATH from 'app-root-path'
import { ConfigMenu, ConfigMenuV2, ConfigTask, ConfigVIP } from '@interface/controller/WeChat'
import { readFileSync } from 'fs'

const ADV_REWARD_LIMIT_COUNT = 5
const ADV_REWARD_CHAT_CHANCE = 10
const SHARE_REWARD_CHAT_CHANCE = 10
const SHARE_REWARD_UPLOAD_CHANCE = 5
const FREE_CHAT_CHANCE = 19
const FREE_UPLOAD_CHANCE = 3
const LIMIT_UPLOAD_SIZE = 5 * 1024 * 1024
const INIT_RESOURCE_ID = 449
const SYSTEM_PROMPT = `
你是乐聊 AI （英：LeChat AI），集成了多种先进AI大模型的统一平台，基于UniAI开发，你已经连接了多家供应商的大模型：包括OpenAI、科大讯飞和百度等。
你的主要功能是对用户所有的问题进行回答或是积极参与对话交流。
`

const { ADMIN_TOKEN } = process.env

const menus: ConfigMenu[] = [
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
        title: `${LIMIT_UPLOAD_SIZE / 1024 / 1024} MB`,
        tip: '上传限制'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-ques.png',
        title: `${FREE_CHAT_CHANCE} 次`,
        tip: '每日对话'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
        title: `${FREE_UPLOAD_CHANCE} 个`,
        tip: '每日上传'
    }
]

const tasks: ConfigTask[] = [
    {
        title: '分享给好友',
        tip: `对话+${SHARE_REWARD_CHAT_CHANCE} 上传+${SHARE_REWARD_UPLOAD_CHANCE}`,
        button: '立即分享',
        type: 1 // 分享
    },
    {
        title: '观看广告',
        tip: `对话+${ADV_REWARD_CHAT_CHANCE}`,
        button: '立即观看',
        type: 3 // 看广告
    },
    {
        title: '关注公众号',
        tip: '获得最新动态',
        button: '立即关注',
        type: 2 // 关注
    }
]

const vips: ConfigVIP[] = [
    {
        bgImg: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip0bg.png',
        bgLine: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702543260823-VIP0%E7%BA%BF%E6%9D%A1.png',
        bgStar: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip0star.png',
        titleImg: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v0text.png',
        backgroundColor: 'rgba(59, 55, 97, 0.15)',
        linearGradient:
            'linear-gradient(to bottom, rgb(98, 93, 144,1) ,rgb(203, 206, 227,0.6) 40%, rgb(223,225,238,1))',
        color: '#3B3761',
        desc: '默认免费用户等级',
        benefits: [
            {
                image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
                title: '5MB',
                tip: '上传限制',
                iconShadow: '0rpx 4rpx 6rpx rgba(53, 46, 120, 0.4）',
                tipColor: '#666666'
            },
            {
                image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
                title: '10个',
                tip: '每日上传',
                iconShadow: '0rpx 4rpx 6rpx rgba(53, 46, 120, 0.4）',
                tipColor: '#666666'
            },
            {
                image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-ques.png',
                title: '99次',
                tip: '每日对话',
                iconShadow: '0rpx 4rpx 6rpx rgba(53, 46, 120, 0.4）',
                tipColor: '#666666'
            }
        ],
        boxShadow: '2rpx 2rpx 16rpx rgba(59, 55, 97, 0.35)'
    },
    {
        bgImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367367779-%E8%93%9D%E8%89%B2%E5%8D%A1%E7%89%87.png',
        bgLine: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367614035-%E6%9D%A1.png',
        bgStar: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367622191-%E5%BE%BD%E7%AB%A0.png',
        titleImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367633444-%E5%AD%97.png',
        backgroundColor: 'rgba(0, 86, 125, 0.15)',
        linearGradient:
            'linear-gradient(to bottom, rgb(76, 147, 253,1) ,rgb(204, 232, 255,0.6) 40%, rgb(188,225,255,0.01))',
        color: '#005CA6',
        desc: '月充值满10元可达成',
        benefits: [
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367654098-%E5%9B%BE%E6%A0%872.png',
                title: '5MB',
                tip: '上传限制',
                iconShadow: '0rpx 4rpx 6rpx rgba(1, 89, 160, 0.5)',
                tipColor: '#666666'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367664545-%E5%9B%BE%E6%A0%871.png',
                title: '20个',
                tip: '每日上传',
                iconShadow: '0rpx 4rpx 6rpx rgba(1, 89, 160, 0.5)',
                tipColor: '#666666'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367673001-%E5%9B%BE%E6%A0%87%E4%B8%89.png',
                title: '199次',
                tip: '每日对话',
                iconShadow: '0rpx 4rpx 6rpx rgba(1, 89, 160, 0.5)',
                tipColor: '#666666'
            }
        ],
        boxShadow: '2rpx 2rpx 16rpx rgba(0, 80, 144, 0.32)'
    },
    {
        bgImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702366975384-%E7%B4%AB%E8%89%B2%E5%8D%A1%E7%89%87.png',
        bgLine: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367228487-%E7%BA%BF.png',
        bgStar: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367238942-%E5%BE%BD%E7%AB%A0.png',
        titleImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367277456-%E5%AD%97.png',
        backgroundColor: 'rgba(77, 0, 118, 0.15)',
        linearGradient:
            'linear-gradient(to bottom, rgb(161, 117, 255,1) ,rgb(220, 212, 255,0.6) 40%, rgb(214,200,255,0))',
        color: '#912AC7',
        desc: '月充值满20元可达成',
        benefits: [
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367299175-Group%20427318823.png',
                title: '5MB',
                tip: '上传限制',
                iconShadow: '0rpx 4rpx 6rpx rgba(74, 0, 113, 0.35)',
                tipColor: '#666666'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367310633-%E5%9B%BE%E6%A0%872.png',
                title: '30个',
                tip: '每日上传',
                iconShadow: '0rpx 4rpx 6rpx rgba(74, 0, 113, 0.35)',
                tipColor: '#666666'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702367320834-%E5%9B%BE%E6%A0%873.png',
                title: '299次',
                tip: '每日对话',
                iconShadow: '0rpx 4rpx 6rpx rgba(74, 0, 113, 0.35)',
                tipColor: '#666666'
            }
        ],
        boxShadow: '2rpx 2rpx 16rpx rgba(58, 0, 89, 0.32)'
    },
    {
        bgImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448741535-%E9%BB%91%E5%8D%A1%E7%89%87.png',
        bgLine: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448750070-%E7%BA%BF%E6%9D%A1.png',
        bgStar: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448757036-%E5%BE%BD%E7%AB%A0.png',
        titleImg: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702543213847-vip3.png',
        backgroundColor: 'rgba(255, 219, 138, 0.28)',
        linearGradient:
            'linear-gradient(to bottom, rgb(255, 184, 0,1) ,rgb(255, 220, 153,0.6) 40%, rgb(255,242,217,0))',
        color: '#ffdb8A',
        desc: '月充值满30元可达成',
        benefits: [
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448774533-%E5%9B%BE%E6%A0%872.png',
                title: '5MB',
                tip: '上传限制',
                iconShadow: '0rpx 4rpx 6rpx rgba(0, 0, 0, 0.2）',
                tipColor: '#dddddd'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448783661-%E5%9B%BE%E6%A0%871.png',
                title: '30个',
                tip: '每日上传',
                iconShadow: '0rpx 4rpx 6rpx rgba(0, 0, 0, 0.2）',
                tipColor: '#dddddd'
            },
            {
                image: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/1702448791609-%E5%9B%BE%E6%A0%873.png',
                title: '399次',
                tip: '每日对话',
                iconShadow: '0rpx 4rpx 6rpx rgba(0, 0, 0, 0.2）',
                tipColor: '#dddddd'
            }
        ],
        boxShadow: '2rpx 2rpx 16rpx rgba(44, 29, 0, 0.5)'
    }
]

// write rows to config table
export default [
    {
        key: 'APP_NAME',
        value: '乐聊-微信小程序',
        description: '小程序名称'
    },
    {
        key: 'APP_URL',
        value: 'https://iict.ac.cn',
        description: '应用官网'
    },
    {
        key: 'APP_VERSION',
        value: 'v2.2.0',
        description: '小程序版本'
    },
    {
        key: 'SYSTEM_PROMPT',
        value: SYSTEM_PROMPT,
        description: 'AI默认提示词'
    },
    {
        key: 'SHOW_NEW_APP',
        value: false,
        description: '是否显示跳转新APP'
    },
    {
        key: 'NEW_APP_ID',
        value: 'wxf124c05330d154e7',
        description: '新APP的ID'
    },
    {
        key: 'ADMIN_TOKEN',
        value: ADMIN_TOKEN,
        description: '超级管理员密码'
    },
    {
        key: 'FOOT_TIP',
        value: '更多信息关注公众号',
        description: '底部标语'
    },
    {
        key: 'FOOT_COPY',
        value: 'IICT（点击复制）',
        description: '底部点击复制'
    },
    {
        key: 'OFFICIAL',
        value: 'IICT_SUZ',
        description: '公众号ID'
    },
    {
        key: 'SHARE_TITLE',
        value: '大模型文档分析对话小程序！',
        description: '小程序分享标题'
    },
    {
        key: 'SHARE_DESC',
        value: '大模型文档分析对话小程序！',
        description: '小程序分享详情'
    },
    {
        key: 'SHARE_IMG',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/share-background.png',
        description: '小程序分享背景图'
    },
    {
        key: 'DEFAULT_AVATAR_AI',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png',
        description: '默认AI头像'
    },
    {
        key: 'DEFAULT_AVATAR_USER',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png',
        description: '默认用户头像'
    },
    {
        key: 'DEFAULT_USERNAME',
        value: '人类用户',
        description: '默认用户名'
    },
    {
        key: 'FREE_CHAT_CHANCE',
        value: FREE_CHAT_CHANCE,
        description: '每日免费对话次数'
    },
    {
        key: 'FREE_UPLOAD_CHANCE',
        value: FREE_UPLOAD_CHANCE,
        description: '每日免费上传次数'
    },
    {
        key: 'SHARE_REWARD_CHAT_CHANCE',
        value: SHARE_REWARD_CHAT_CHANCE,
        description: '分享奖励对话次数'
    },
    {
        key: 'SHARE_REWARD_UPLOAD_CHANCE',
        value: SHARE_REWARD_UPLOAD_CHANCE,
        description: '分享奖励上传次数'
    },
    {
        key: 'ADV_REWARD_CHAT_CHANCE',
        value: ADV_REWARD_CHAT_CHANCE,
        description: '广告增加聊天次数'
    },
    {
        key: 'ADV_REWARD_LIMIT_COUNT',
        value: ADV_REWARD_LIMIT_COUNT,
        description: '24小时广告奖励上限'
    },
    {
        key: 'ADV_REWARD_UPLOAD_CHANCE',
        value: ADV_REWARD_CHAT_CHANCE,
        description: '广告增加上传次数'
    },
    {
        key: 'FOLLOW_REWARD_CHAT_CHANCE',
        value: 0,
        description: '默认关注奖励次数'
    },
    {
        key: 'LIMIT_UPLOAD_SIZE',
        value: LIMIT_UPLOAD_SIZE,
        description: '默认上传限制（Byte）'
    },
    {
        key: 'INIT_RESOURCE_ID',
        value: INIT_RESOURCE_ID,
        description: '初始化文档ID'
    },
    {
        key: 'AUDITOR_AI_PROMPT',
        value: readFileSync(`${ROOT_PATH}/app/data/prompt-audit.md`, 'utf-8'),
        description: 'AI审核提示词'
    },
    {
        key: 'WX_REVIEW_FILE',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/file_review.pdf',
        description: '文件审核通知'
    },
    // v1.0
    {
        key: 'USER_MENU',
        value: JSON.stringify(menus),
        description: '小程序用户菜单栏'
    },
    {
        key: 'USER_TASK',
        value: JSON.stringify(tasks),
        description: '小程序用户菜单栏2'
    },
    {
        key: 'USER_MENU_VIP_ICON',
        value: JSON.stringify([
            'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip_upload.png',
            'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip_file.png',
            'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip_chat.png'
        ]),
        description: '用户界面会员权益图标'
    },
    {
        key: 'USER_MENU_MEMBER',
        value: JSON.stringify({
            icon: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/icon-1703128714624.png',
            title: '充值记录',
            tip: '历史充值记录',
            show: true
        } as ConfigMenuV2),
        description: '小程序用户-会员中心'
    },
    {
        key: 'USER_MENU_INFO',
        value: JSON.stringify({
            icon: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/icon-1703128704007.png',
            title: '个人资料',
            tip: '修改个人信息',
            show: true
        } as ConfigMenuV2),
        description: '小程序用户-个人资料'
    },
    {
        key: 'USER_MENU_SHARE',
        value: JSON.stringify({
            icon: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/icon-1703128723551.png',
            title: '分享给好友',
            tip: '增加20次对话和5次上传',
            show: true
        } as ConfigMenuV2),
        description: '小程序用户-分享给好友'
    },
    {
        key: 'USER_MENU_FOCUS',
        value: JSON.stringify({
            icon: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/icon-1703128731207.png',
            title: '关注公众号',
            tip: '中科苏州智能计算技术研究院',
            show: true
        } as ConfigMenuV2),
        description: '小程序用户-关注公众号'
    },
    {
        key: 'USER_MENU_ADV',
        value: JSON.stringify({
            icon: 'http://openai-1259183477.cos.ap-shanghai.myqcloud.com/icon-1703128696275.png',
            title: '观看广告',
            tip: '增加20次对话和2次上传',
            show: true
        } as ConfigMenuV2),
        description: '小程序用户-观看广告'
    },
    {
        key: 'USER_VIP',
        value: JSON.stringify(vips),
        description: '小程序用户等级'
    }
]
