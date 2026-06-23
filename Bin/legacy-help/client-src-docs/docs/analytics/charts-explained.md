# Analytics Charts Explained

## Overview

Analytics charts in Rayenna CRM transform your business data into visual representations that make it easy to understand trends, patterns, and performance. This guide explains each chart type in simple terms and shows you how to interpret the insights they provide.

## Classic Dashboard — opening Projects from a chart

On the **classic Dashboard** (the main role-based home screen), **most charts are clickable**. Click a **bar**, **FY column** (click the **blue** revenue bar or the **green** profit bar separately), **pie slice**, **financing bank bar**, **panel or inverter brand bar**, a **word** in the **Customer profitability** cloud, or a row in **Top 10** to navigate to **Projects** with filters that match that slice and your dashboard **FY / Quarter / Month**.

- Tooltips often say **Click to open Projects →** (or similar).
- **Zenith** uses the same slice definitions for many charts but usually opens **Quick Actions** first; use **Open in Projects →** there. See [Dashboard → Classic Dashboard chart click-through](/help/dashboard#classic-dashboard-chart-click-through-to-projects) and [Zenith → Explore charts](/help/zenith#explore-charts-and-drill-down-zenith).

## Project Value & Profit by Financial Year

### What This Chart Shows

This chart displays your total project value (revenue) and total profit across different Financial Years. It's a grouped bar chart with two bars for each Financial Year - one showing project value and one showing profit.

### Understanding the Chart

**Chart Type**: Grouped Column Chart (Bar Chart)

**What You See**:
- **X-Axis (Horizontal)**: Financial Years (e.g., 2023-24, 2024-25)
- **Y-Axis (Vertical)**: Amount in Rupees (₹)
- **Two Bars per Year**:
  - **Project Value Bar** (usually blue): Total revenue/order value
  - **Profit Bar** (usually green): Total profit earned

**Visual Elements**:
- Bars grouped by Financial Year
- Two different colors for value vs profit
- Grid lines for easy reading
- Tooltip shows exact values on hover
- On the **classic Dashboard**, click the **revenue** bar or the **profit** bar for an FY to open **Projects** filtered for that year and metric (tooltips include a click hint)

### How to Read This Chart

**Basic Reading**:
1. **Look at the Years**: See which Financial Years are shown
2. **Compare Bars**: Compare project value and profit for each year
3. **Check Heights**: Taller bars mean higher values
4. **Compare Years**: See how performance changes over time

**Understanding the Data**:
- **Project Value**: Total revenue from all projects in that FY
- **Profit**: Money earned after costs (Project Value - Total Costs)
- **Difference**: The gap between bars shows your profit margin
- **Trend**: Are values and profits increasing or decreasing?

### Interpreting Insights

**Growth Trends**:
- **Upward Trend**: If bars get taller each year, business is growing
- **Declining Trend**: If bars get shorter, business may be declining
- **Stable Performance**: Similar heights indicate steady business

**Profitability Analysis**:
- **Large Profit Bar**: Good profitability, healthy margins
- **Small Profit Bar**: Lower margins, may need cost optimization
- **Profit vs Value Gap**: Shows profit margin percentage
- **Consistent Gap**: Stable profit margins over time

**Year-over-Year Comparison**:
- **Compare 2023-24 vs 2024-25**: See if you're growing
- **Identify Best Year**: Which FY had highest value/profit?
- **Spot Patterns**: Are there seasonal or cyclical trends?
- **Plan Ahead**: Use trends to forecast next year

**What to Look For**:
- ✅ **Positive Signs**: Increasing bars, growing profit, stable margins
- ⚠️ **Warning Signs**: Declining bars, shrinking profit, widening gaps
- 📊 **Opportunities**: Years with high value but low profit (optimize costs)

### Using the Filter

**Financial Year Filter**:
- Select "All Financial Years" to see complete history
- Select specific FY to focus on one year
- Compare different periods
- Analyze trends over time

**Filter Tips**:
- Start with "All" to see big picture
- Focus on specific years for detailed analysis
- Compare recent years to identify trends
- Use filter to answer specific questions

### Practical Examples

**Example 1: Growing Business**
- Bars increase each year
- Both value and profit growing
- **Insight**: Business is expanding successfully
- **Action**: Continue current strategies

**Example 2: High Value, Low Profit**
- Value bars are tall
- Profit bars are short
- **Insight**: Revenue high but margins low
- **Action**: Review costs and pricing

**Example 3: Declining Performance**
- Bars decreasing over time
- Both value and profit declining
- **Insight**: Business needs attention
- **Action**: Investigate causes and take corrective measures

## Revenue by Customer Type & Pipeline by Customer Type

### What These Charts Show

On the **classic Dashboard** and in **Zenith**, you may see one or two donut (pie) charts:

- **Revenue by Customer Type** — share of **revenue-eligible** project value by customer type
- **Pipeline by Customer Type** — share of **open pipeline** value by customer type

Each slice is a **customer type** from **Customer Master** on the linked customer: **Residential**, **Apartment**, or **Commercial**. Slice size is that type’s share of the chart total.

**Not the same as project Segment** — The **Segment** filter on **Projects** (Subsidy / Non-Subsidy) is a **project** field. These donuts do **not** use that field. If help or conversation says “segment donut,” it usually means this **customer type** chart (legacy wording).

### Understanding the Charts

**Chart type**: Donut / pie

**What you see**:
- One slice per **customer type** (plus **Unassigned** when the project has no linked customer type)
- **Colors** and **legend** per type
- **Percentages** on or beside slices
- **Classic Dashboard**: click a slice → **Projects** with **Customer type** and the matching analytics slice (revenue vs pipeline)
- **Zenith**: click a slice → **Quick Actions** drawer list; **Open in Projects →** applies the same **Customer type** filter

**Cohort rules**:
- **Revenue** chart: revenue-eligible projects only (same rules as other revenue analytics)
- **Pipeline** chart: open pipeline only — a different total than revenue; do not compare slice sizes across the two charts as if they were the same population

### How to Read These Charts

1. **Largest slice** — which customer type drives most value in that chart’s cohort
2. **Compare the pair** — revenue mix vs pipeline mix can differ (e.g. strong Commercial in pipeline, smaller in revenue)
3. **Unassigned** — projects missing customer type on the customer record; fix in **Customer Master** or project link
4. **FY filter** (Dashboard) — narrows which projects enter the totals; Zenith uses its own date filters

### Interpreting Insights

- **Concentration** — one type dominates → risk if that market slows
- **Pipeline vs revenue gap** — large Apartment in pipeline but small in revenue → future mix may shift
- **Apartment vs Residential** — both are “residential-ish” in conversation but are **separate** types in data; read slices literally

### Practical Examples

**Example 1: Balanced revenue mix**
- Similar slices for Residential, Apartment, Commercial
- **Insight**: Diversified booked revenue
- **Action**: Keep balanced sales motion

**Example 2: Pipeline skew**
- **Pipeline by Customer Type** shows large Commercial slice; **Revenue by Customer Type** smaller
- **Insight**: Commercial deals in flight not yet revenue-eligible
- **Action**: Review stage and conversion for those projects

**Example 3: Unassigned slice**
- Visible **Unassigned** on either chart
- **Insight**: Data quality gap on customer type
- **Action**: Update customers and re-check charts after sync

## Customer Profitability Word Cloud

### What This Chart Shows

This word cloud visualization shows your most profitable customers. Customer names are displayed as words, and the size of each word represents how profitable that customer is - larger words mean higher profitability.

### Understanding the Chart

**Chart Type**: Word Cloud Visualization

**What You See**:
- **Customer Names**: Displayed as text words
- **Word Sizes**: Larger text = more profitable customer
- **Layout**: Words arranged artistically in cloud formation
- **Colors**: Different colors for visual distinction
- **Interactive**: Can filter by Financial Year and Month; on the **classic Dashboard** and in **Zenith** (**Customer projects profitability**), **click a word** in the cloud or a **Top 10** row to open **Projects** with a **search** on that customer name and the profitability / revenue slice (plus dashboard / command-bar dates)

**How It Works**:
- Each customer's name appears as a word
- Word size is proportional to profitability
- Most profitable customers have largest text
- Less profitable customers have smaller text

### How to Read This Chart

**Basic Reading**:
1. **Look at Word Sizes**: Largest words are most profitable
2. **Identify Top Customers**: Find the biggest words
3. **Check All Customers**: See all customers represented
4. **Compare Sizes**: Understand relative profitability

**Understanding the Data**:
- **Word Size**: Based on total profit from that customer
- **Larger = More Profit**: Bigger words mean higher profitability
- **Smaller = Less Profit**: Smaller words mean lower profitability
- **Missing Names**: Customers with no profit may not appear

### Interpreting Insights

**Customer Value Identification**:
- **Top Customers**: Largest words are your most valuable customers
- **Key Relationships**: Identify customers to prioritize
- **Profit Concentration**: See if profit is concentrated in few customers
- **Customer Distribution**: Understand profit spread across customers

**Relationship Management**:
- **VIP Customers**: Largest words need special attention
- **Growth Opportunities**: Medium-sized words may have potential
- **Underperformers**: Small words may need attention or review
- **Customer Mix**: See if you have diverse customer base

**Strategic Planning**:
- **Focus Areas**: Prioritize relationships with large-word customers
- **Retention Strategy**: Protect relationships with profitable customers
- **Growth Strategy**: Develop medium-sized customers
- **Portfolio Balance**: Ensure not too dependent on few customers

**What to Look For**:
- ✅ **Positive Signs**: Multiple large words, balanced distribution, growing words
- ⚠️ **Warning Signs**: Only few large words, over-concentration, shrinking words
- 📊 **Opportunities**: Medium-sized words with growth potential

### Using the Filters

**Financial Year Filter**:
- Select "All Financial Years" to see overall profitability
- Select specific FY to see profitability for that period
- Compare profitability across years
- Track customer value changes

**Month Filter** (requires single FY):
- Filter to specific months within a Financial Year
- See seasonal patterns
- Analyze monthly profitability
- Identify peak periods

**Filter Tips**:
- Use filters to analyze specific periods
- Compare different timeframes
- Track customer profitability trends
- Identify seasonal patterns

### Practical Examples

**Example 1: Balanced Customer Base**
- Many medium to large words
- Good distribution of sizes
- **Insight**: Healthy customer portfolio
- **Action**: Maintain diverse customer base

**Example 2: Top Customer Dominance**
- One or two very large words
- Many small words
- **Insight**: Heavy reliance on few customers
- **Action**: Diversify customer base, reduce dependency

**Example 3: Growing Customer**
- Customer name getting larger over time
- **Insight**: Customer relationship improving
- **Action**: Continue nurturing this relationship

## Projects Availing Loans by Bank

### What This Chart Shows

This column chart shows how many projects have **Availing Loan** selected and are linked to each financing bank. Only projects where the Availing Loan checkbox is ticked and a bank is selected are counted. The chart helps you see which banks your customers use most for financing.

### Understanding the Chart

**Chart Type**: Column Chart (Bar Chart)

**What You See**:
- **X-Axis (Horizontal)**: Bank names (e.g. State Bank of India, HDFC Bank, Other)
- **Y-Axis (Vertical)**: Number of projects (count)
- **Bars**: One bar per bank; taller bar = more projects availing loan from that bank

**Availability**: Shown on Sales, Finance, and Management/Admin dashboards. Not shown to Operations.

**Filters**: The chart respects the Dashboard filters (FY, Quarter, Month). Sales users see only their own projects.

**Click-through**: On the **classic Dashboard**, click a **bank bar** to open **Projects** with **Availing Loan** and that **financing bank**, plus dashboard dates.

### How to Read This Chart

- **Compare banks**: See which banks have the most projects.
- **Other**: The “Other” column is always shown on the right; it includes projects where a bank was entered as “Other” (custom name).
- **Empty chart**: If no projects have Availing Loan and a bank selected for the selected period, the chart shows “No data for selected period”.

### Interpreting Insights

- **Bank concentration**: One or two tall bars may indicate most customers use the same banks.
- **Diversification**: Many similar-height bars suggests spread across multiple banks.
- **Planning**: Use the data for tie-ups or discussions with specific banks.

## Sales Team Performance Charts

### What This Chart Shows

This chart displays the performance of your sales team members, showing how much revenue each salesperson has generated. It helps you compare team members and identify top performers.

### Understanding the Chart

**Chart Type**: Column Chart (Bar Chart)

**What You See**:
- **X-Axis (Horizontal)**: Salesperson names
- **Y-Axis (Vertical)**: Total order value in Rupees (₹)
- **Bars**: One bar per salesperson
- **Bar Heights**: Taller bars = more revenue
- **Colors**: Different colors for each salesperson

**Additional Information**:
- **Project Count**: Number of projects per salesperson
- **Total Order Value**: Revenue generated by each person
- **Comparison**: Easy to compare team members

### How to Read This Chart

**Basic Reading**:
1. **Look at Bar Heights**: Taller bars = better performance
2. **Compare Salespeople**: See who's performing best
3. **Check Values**: Hover for exact amounts
4. **Review Project Counts**: See activity levels

**Understanding the Data**:
- **Bar Height**: Total revenue generated by salesperson
- **Taller Bar**: Higher revenue, better performance
- **Shorter Bar**: Lower revenue, may need support
- **Project Count**: Number of projects (activity indicator)

### Interpreting Insights

**Performance Comparison**:
- **Top Performers**: Highest bars are your best salespeople
- **Average Performers**: Medium-height bars show solid performance
- **Underperformers**: Low bars may need support or training
- **Team Balance**: See if performance is balanced or skewed

**Revenue Distribution**:
- **Even Distribution**: Similar bar heights show balanced team
- **Top-Heavy**: Few high bars show reliance on stars
- **Bottom-Heavy**: Many low bars indicate team challenges
- **Growth Potential**: Identify who can improve

**Team Analysis**:
- **Identify Stars**: Top performers to recognize and learn from
- **Support Needs**: Lower performers who may need help
- **Training Opportunities**: Team members with potential
- **Resource Allocation**: Where to focus coaching efforts

**What to Look For**:
- ✅ **Positive Signs**: Multiple high bars, balanced team, growing bars
- ⚠️ **Warning Signs**: Many low bars, declining performance, large gaps
- 📊 **Opportunities**: Medium bars with growth potential, training needs

### Using the Filters

**Financial Year Filter**:
- Select "All Financial Years" for overall performance
- Select specific FY to see performance for that period
- Compare performance across years
- Track individual growth

**Month Filter** (requires single FY):
- Filter to specific months
- See monthly performance
- Identify peak periods
- Analyze seasonal patterns

**Filter Tips**:
- Compare team performance over time
- Identify trends and patterns
- Track individual improvements
- Analyze seasonal variations

### Practical Examples

**Example 1: Balanced Team**
- Similar bar heights across team
- No extreme differences
- **Insight**: Well-balanced sales team
- **Action**: Maintain team structure

**Example 2: Star Performer**
- One very tall bar
- Others significantly lower
- **Insight**: One person driving most revenue
- **Action**: Learn from star, develop others

**Example 3: Improving Team**
- Bars getting taller over time
- Most team members growing
- **Insight**: Team performance improving
- **Action**: Continue current strategies

## General Chart Reading Tips

### Understanding Any Chart

**Start with the Title**:
- Read the chart title to understand what it shows
- Check the axes labels
- Understand the data being displayed

**Look at the Visual Elements**:
- **Colors**: What do different colors represent?
- **Sizes**: What do different sizes mean?
- **Positions**: How are elements arranged?
- **Labels**: What do the labels tell you?

**Use Interactive Features**:
- **Hover**: Hover over elements for details
- **Click**: On the **classic Dashboard**, many charts open **Projects** with matching filters; in **Zenith**, chart clicks usually open **Quick Actions** with **Open in Projects →** in the footer
- **Tooltips**: Read tooltips for exact values and click hints
- **Legends**: Use legends to understand colors

### Comparing Charts

**Time-Based Comparison**:
- Compare charts across different periods
- Look for trends and patterns
- Identify changes over time
- Track improvements or declines

**Segment Comparison**:
- Compare different segments
- Identify best and worst performers
- Find opportunities
- Understand market mix

**Team Comparison**:
- Compare team members
- Identify top performers
- Find training opportunities
- Balance team resources

### Getting Insights

**Ask Questions**:
- What does this chart tell me?
- What trends do I see?
- What stands out?
- What needs attention?

**Look for Patterns**:
- Are there consistent trends?
- Do I see seasonal patterns?
- Are there anomalies?
- What's the overall story?

**Take Action**:
- Use insights to make decisions
- Identify areas for improvement
- Recognize successes
- Plan for the future

## Best Practices

### Regular Review

**Daily Check**:
- Quick glance at key charts
- Monitor current status
- Identify urgent items

**Weekly Analysis**:
- Detailed chart review
- Compare with previous week
- Identify trends
- Plan improvements

**Monthly Deep Dive**:
- Comprehensive analysis
- Compare periods
- Strategic insights
- Planning and forecasting

### Effective Analysis

**Start Broad, Then Narrow**:
- Begin with overall view
- Filter to specific periods
- Drill down into details
- Focus on key insights

**Compare and Contrast**:
- Compare different periods
- Compare segments
- Compare team members
- Identify differences

**Look for Stories**:
- What story does the data tell?
- What patterns emerge?
- What surprises appear?
- What actions are needed?

### Sharing Insights

**Team Communication**:
- Share relevant charts with team
- Discuss findings in meetings
- Use charts in presentations
- Collaborate on improvements

**Management Reporting**:
- Use charts in reports
- Highlight key insights
- Support recommendations
- Track progress

## Troubleshooting

### Chart Not Displaying

**Issue**: Chart shows "No data available"

**Solutions**:
- Check if data exists for selected period
- Verify filters are not too restrictive
- Try selecting "All Financial Years"
- Contact administrator if issue persists

### Chart Values Seem Wrong

**Issue**: Numbers don't match expectations

**Solutions**:
- Check filter settings
- Verify date ranges
- Ensure data is entered correctly
- Refresh page to get latest data

### Cannot Use Filters

**Issue**: Filters not working or not available

**Solutions**:
- Check if FY is selected for Month filter
- Verify filter selections are valid
- Clear filters and try again
- Refresh page

## Getting Help

### Using Help Features

- Press **?** from Dashboard for context-sensitive help
- Click **Help** in navigation menu
- Review this guide for detailed information

### Contact Administrator

Contact administrator for:
- Charts not displaying correctly
- Data appears incorrect
- Cannot use chart filters
- Technical issues
- Questions about chart interpretation

## Projects by panel brand & inverter brand (Dashboard + Zenith)

On the **classic Dashboard**, **Sales**, **Management**, **Admin**, and **Operations** see a pair of horizontal bar charts: **Projects by panel brand** and **Projects by inverter brand**. The cohort matches **Zenith**: each bar only includes projects that already have **both** brands saved in Project Lifecycle. **Click a bar** to open **Projects** with that brand and the lifecycle completeness filter, plus dashboard dates. **Finance** does not see these charts on the classic Dashboard.

## Zenith — Projects by panel brand & inverter brand (Explore)

The same charts appear under **Zenith → Explore the landscape** on **executive** Zenith (**Sales**, **Management**, **Admin**) and **Operations** Zenith.

**Hover** a bar to see: **brand** name, **project count**, **Order value (sum)**, **System capacity (sum)** in **kW** (total installed capacity recorded on those projects; shows **—** if none), an estimated **panel** or **inverter** cost line, and a hint to **click through**. On **Zenith**, the drill opens **Quick Actions**; on the **classic Dashboard**, the same bars jump straight to **Projects**. Full behaviour: [Zenith → Panel and inverter brand charts](/help/zenith#panel-and-inverter-brand-charts-zenith).

---

## Summary

Analytics charts provide:
- **Visual Insights**: Easy-to-understand data visualization
- **Trend Analysis**: See patterns and changes over time
- **Performance Comparison**: Compare segments, teams, periods
- **Strategic Planning**: Support data-driven decisions

**Key Charts**:
- Project Value & Profit by Financial Year: Track revenue and profitability trends
- Revenue / Pipeline by Customer Type: Understand customer-type mix (not Subsidy/Non-Subsidy segment)
- Customer Profitability Word Cloud: Identify most valuable customers
- Projects Availing Loans by Bank: See project count by financing bank (Sales, Finance, Management/Admin)
- Sales Team Performance: Compare team member performance

**Remember**:
- Charts make data easy to understand
- On the **classic Dashboard**, click many chart elements to open a filtered **Projects** list (see [Classic Dashboard — opening Projects from a chart](#classic-dashboard-opening-projects-from-a-chart))
- Use filters to focus on relevant data
- Compare periods to identify trends
- Act on insights to drive improvement
- Regular review improves decision-making
