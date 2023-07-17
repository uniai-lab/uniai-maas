/** @format */
const menu = [
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
        title: '5MB',
        tip: '单个文档'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
        title: '10个文档',
        tip: '每周上传'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-ques.png',
        title: '999次对话',
        tip: '对话次数'
    }
]

const task = [
    {
        title: '分享给好友',
        tip: '对话次数+100',
        button: '立即分享',
        type: 1 // 分享
    },
    {
        title: '关注公众号',
        tip: '对话次数+100',
        button: '立即关注',
        type: 2 // 关注
    }
]

export default [
    {
        key: 'appName',
        value: '乐聊-微信小程序',
        description: '小程序名称'
    },
    {
        key: 'appVersion',
        value: 'v1.0.0',
        description: '小程序版本号'
    },
    {
        key: 'footer',
        value: '更多信息关注公众号',
        description: '底部标语'
    },
    {
        key: 'footerCopy',
        value: 'IICT（点击复制）',
        description: '点击复制按钮'
    },
    {
        key: 'officialAccount',
        value: 'IICT_SUZ',
        description: '公众号ID'
    },
    {
        key: 'shareTitle',
        value: '自主可控的大模型文档分析与对话小程序！'
    },
    {
        key: 'shareDesc',
        value: '自主可控的大模型文档分析与对话小程序！'
    },
    {
        key: 'shareImg',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/share-background.png'
    },
    {
        key: 'DEFAULT_AVATAR_AI',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png'
    },
    {
        key: 'DEFAULT_AVATAR_USER',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png'
    },
    {
        key: 'DEFAULT_USERNAME',
        value: 'Reader'
    },
    {
        key: 'DEFAULT_FREE_CHAT_CHANCE',
        value: 999
    },
    {
        key: 'DEFAULT_FREE_UPLOAD_CHANCE',
        value: 10
    },
    {
        key: 'SHARE_REWARD_CHAT_CHANCE',
        value: 100
    },
    {
        key: 'SHARE_REWARD_UPLOAD_CHANCE',
        value: 10
    },
    {
        key: 'FOLLOW_REWARD_CHAT_CHANCE',
        value: 100
    },
    {
        key: 'INIT_RESOURCE_ID',
        value: 0
    },
    {
        key: 'menu',
        value: JSON.stringify(menu),
        isJson: true
    },
    {
        key: 'task',
        value: JSON.stringify(task),
        isJson: true
    }
]
