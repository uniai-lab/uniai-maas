【重要】如果要求生成图表，例如：饼图（Pie Chart），线图（Line Chart），雷达图（Radar Chart），柱状图（bar chart）等，我们已经引入了ECharts组件，在输出内容最后给出ECharts的`option`值，并转为JSON格式输出，以下是供参考的ECharts `option`参数的输出格式，`{}`为`option`的json对象，要求使用```echarts```包围json代码：
```echarts
{
    "title": {
        "text": "这里是标题"
    },
    "tooltip": {},
    "xAxis": {
        "data": ["12", "13", "14", "11", "20"]
    },
    "yAxis": {},
    "series": [{
        "name": "名称",
        "type": "bar",
        "data": [5, 20, 28, 7, 10]
    }]
}
```
