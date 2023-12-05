/** @format */

const menus = [
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
        title: '5MB',
        tip: '单个文档'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
        title: '10个',
        tip: '每周上传'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-ques.png',
        title: '99次',
        tip: '每周对话'
    }
]

const tasks = [
    {
        title: '分享给好友',
        tip: '对话+20 上传+5',
        button: '立即分享',
        type: 1 // 分享
    },
    {
        title: '关注公众号',
        tip: '加对话上传次数',
        button: '立即关注',
        type: 2 // 关注
    }
]

const vips = [
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip0bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip0line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip0star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v0text.png',
        backgroundColor: 'rgb(201,199,222,0.4)',
        color: '#3B3761',
        lefttoptitle: '未到达',
        needchart: 0,
        menus: []
    },
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip1bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip1line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip1star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v1text.png',
        backgroundColor: 'rgb(212,152,91,0.2)',
        color: '#E6A058',
        lefttoptitle: '未到达',
        needchart: 10,
        menu: []
    },
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip2bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip2line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip2star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v2text.png',
        backgroundColor: 'rgb(48,89,122,0.12)',
        color: '#3B3761',
        lefttoptitle: '未到达',
        needchart: 20,
        menu: []
    },
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip3bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip3line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip3star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v3text.png',
        backgroundColor: 'rgb(119,153,209,0.24)',
        color: '#214B62',
        lefttoptitle: '未到达',
        needchart: 30,
        menu: []
    },
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip4bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip4line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip4star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v4text.png',
        backgroundColor: 'rgb(126,97,235,0.24)',
        color: '#705AC6',
        lefttoptitle: '未到达',
        needchart: 40,
        menu: []
    },
    {
        bgimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip5bg.png',
        bglineurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip5line.png',
        bgstarurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/vip5star.png',
        titleimgurl: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/v5text.png',
        backgroundColor: 'rgb(0,0,0,0.17)',
        color: '#CCCCCC',
        lefttoptitle: '未到达',
        needchart: 50,
        menu: []
    }
]

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
        key: 'ADMIN_TOKEN',
        value: process.env.ADMIN_TOKEN,
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
        key: 'DEFAULT_FREE_CHAT_CHANCE',
        value: 99,
        description: '默认免费次数'
    },
    {
        key: 'DEFAULT_FREE_UPLOAD_CHANCE',
        value: 10,
        description: '默认免费上传次数'
    },
    {
        key: 'SHARE_REWARD_CHAT_CHANCE',
        value: 20,
        description: '默认分享奖励聊天次数'
    },
    {
        key: 'SHARE_REWARD_UPLOAD_CHANCE',
        value: 5,
        description: '默认分享奖励上传次数'
    },
    {
        key: 'FOLLOW_REWARD_CHAT_CHANCE',
        value: 33,
        description: '默认关注奖励次数'
    },
    {
        key: 'INIT_RESOURCE_ID',
        value: 449,
        description: '初始化文档'
    },
    {
        key: 'LIMIT_UPLOAD_SIZE',
        value: 5 * 1024 * 1024,
        description: '默认上传限制 Byte'
    },
    {
        key: 'GPT_DEFAULT_SUB_MODEL',
        value: 'gpt-3.5-turbo',
        description: 'GPT默认模型'
    },
    {
        key: 'GLM_DEFAULT_SUB_MODEL',
        value: 'chatglm3-6b-32k',
        description: 'GLM默认模型'
    },
    {
        key: 'SPK_DEFAULT_SUB_MODEL',
        value: 'v1.1',
        description: '星火默认模型'
    },
    {
        key: 'WX_EMBED_MODEL',
        value: 'GLM',
        description: '小程序默认embed模型'
    },
    {
        key: 'WX_CHAT_MODEL',
        value: 'SPARK',
        description: '小程序默认chat模型'
    },
    {
        key: 'WX_CHAT_SUB_MODEL',
        value: 'v1.1',
        description: '小程序默认chat子模型'
    },
    {
        key: 'WX_RESOURCE_MODEL',
        value: 'GLM',
        description: '小程序默认resource模型'
    },
    {
        key: 'WX_RESOURCE_SUB_MODEL',
        value: 'chatglm3-6b-32k',
        description: '小程序默认resource子模型'
    },
    {
        key: 'USER_BACKGROUND_IMG',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/user-home-bg.jpg',
        description: '小程序用户界面背景图'
    },
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
        key: 'USER_VIP',
        value: JSON.stringify(vips),
        description: '小程序用户等级'
    }
]
