/** @format */
const menu = [
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
        title: '2MB',
        tip: '单个文档'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
        title: '5个文档',
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
        buttonTitle: '立即分享',
        type: 1 // 分享
    },
    {
        title: '关注公众号',
        tip: '对话次数+100',
        buttonTitle: '立即关注',
        type: 2 // 关注
    }
]

export default [
    {
        key: 'appName',
        value: '读书君',
        description: '小程序名称'
    },
    {
        key: 'appVersion',
        value: 'v1.0.1',
        description: '小程序版本号'
    },
    {
        key: 'footer',
        value: '更多福利请关注公众号',
        description: '底部标语'
    },
    {
        key: 'footerCopy',
        value: '智读君（点击复制）',
        description: '点击复制按钮'
    },
    {
        key: 'officialAccount',
        value: 'readbot',
        description: '公众号名'
    },
    {
        key: 'shareTitle',
        value: 'AI文档分析利器，不来试试吗？'
    },
    {
        key: 'shareDesc',
        value: 'AI文档分析利器，不来试试吗？'
    },
    {
        key: 'shareImg',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/share-background.png'
    },
    {
        key: 'DEFAULT_AVATAR_AI',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-ai.png'
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
        value: 5
    },
    {
        key: 'SHARE_REWARD_CHAT_CHANCE',
        value: 100
    },
    {
        key: 'SHARE_REWARD_UPLOAD_CHANCE',
        value: 0
    },
    {
        key: 'FOLLOW_REWARD_CHAT_CHANCE',
        value: 100
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
