package com.stp.monitor.mqtt;
import java.util.*;

/**
 * Modbus 16位寄存器位解析器（完整版）
 * 适用于有人物联网边缘网关采集的西门子PLC V区数据
 * 
 * 码表映射规则：
 * - 40001 (地址0) -> VW0  (V0.0 ~ V1.7) -> bit 0~15
 * - 40002 (地址1) -> VW2  (V2.0 ~ V3.7) -> bit 0~15
 * - 40003 (地址2) -> VW4  (V4.0 ~ V5.7) -> bit 0~15
 * - 40004 (地址3) -> VW6  (V6.0 ~ V6.5) -> bit 0~5  (bit6~15预留)
 * - 40006 (地址5) -> VW10 (V10.1~V10.2)-> bit 1~2  (其余预留)
 * 
 * 主键标识：使用码表最后一列"拼音首字母"替换原"I_O点"作为设备唯一编码
 */
public class ModbusRegisterParser {

    /**
     * 单个Bit位的设备定义
     * 使用"拼音首字母"(code)作为主标识，原I_O点(ioPoint)作为辅助参考
     */
    public static class DeviceBit {
        private final String monitorId;        // 拼音首字母（主标识，如 CGZJSDQD）
        private final String ioPoint;     // 原始I_O点（如 V0.0），辅助参考
        private final String deviceName;  // 设备名称（如 粗格栅机）
        private final String action;      // 动作（如 手动启动）
        private final int bitPosition;    // 在16位寄存器中的位置 0~15
        private final String onDesc;      // 量程_ON描述（如 手动、自动、一键自动）
        private final String offDesc;     // 位_OFF描述（如 停止、正常）

        public DeviceBit(String monitorId, String ioPoint, String deviceName, String action,
                         int bitPosition, String onDesc, String offDesc) {
            this.monitorId = monitorId;
            this.ioPoint = ioPoint;
            this.deviceName = deviceName;
            this.action = action;
            this.bitPosition = bitPosition;
            this.onDesc = onDesc;
            this.offDesc = offDesc;
        }

        public String getMonitorId() { return monitorId; }
        public String getIoPoint() { return ioPoint; }
        public String getDeviceName() { return deviceName; }
        public String getAction() { return action; }
        public int getBitPosition() { return bitPosition; }
        public String getOnDesc() { return onDesc; }
        public String getOffDesc() { return offDesc; }

        @Override
        public String toString() {
            return String.format("%s (%s) %s %s [bit%d]", monitorId, ioPoint, deviceName, action, bitPosition);
        }
    }

    /**
     * 解析后的设备状态
     */
    public static class DeviceState {
        private final DeviceBit bitDef;
        private final boolean value;       // true=1, false=0
        private final String statusText;   // 根据码表量程描述转换后的状态文本

        public DeviceState(DeviceBit bitDef, boolean value) {
            this.bitDef = bitDef;
            this.value = value;
            // 根据码表"量程_ON描述"和"位_OFF描述"生成状态文本
            this.statusText = value ? bitDef.getOnDesc() : bitDef.getOffDesc();
        }

        public DeviceBit getBitDef() { return bitDef; }
        public boolean isOn() { return value; }
        public String getStatusText() { return statusText; }

        @Override
        public String toString() {
            return String.format("%-22s %-10s -> %s",
                bitDef.getMonitorId() + " [" + bitDef.getDeviceName() + bitDef.getAction() + "]",
                value ? "ON(1)" : "OFF(0)",
                statusText);
        }
    }

    // ==================== 寄存器位映射定义（完整码表） ====================

    /** 40001 (Modbus地址0) - VW0: V0.0 ~ V1.7 */
    public static final List<DeviceBit> REGISTER_40001 = Arrays.asList(
        new DeviceBit("CGZJSDQD",   "V0.0",  "粗格栅机",     "手动启动", 0,  "手动", "停止"),
        new DeviceBit("CGZJZDQD",   "V0.1",  "粗格栅机",     "自动启动", 1,  "自动", "停止"),
        new DeviceBit("LXYZJSDQD",  "V0.2",  "螺旋压榨机",   "手动启动", 2,  "手动", "停止"),
        new DeviceBit("LXYZJZDQD",  "V0.3",  "螺旋压榨机",   "自动启动", 3,  "自动", "停止"),
        new DeviceBit("XGZJSDQD",   "V0.4",  "细格栅机",     "手动启动", 4,  "手动", "停止"),
        new DeviceBit("XGZJZDQD",   "V0.5",  "细格栅机",     "自动启动", 5,  "自动", "停止"),
        new DeviceBit("LXSSJSDQD",  "V0.6",  "螺旋输送机",   "手动启动", 6,  "手动", "停止"),
        new DeviceBit("LXSSJZDQD",  "V0.7",  "螺旋输送机",   "自动启动", 7,  "自动", "停止"),
        new DeviceBit("QBJZZSDQD",  "V1.0",  "启闭机正转",   "手动启动", 8,  "手动", "停止"),
        new DeviceBit("QBJZZZDQD",  "V1.1",  "启闭机正转",   "自动启动", 9,  "自动", "停止"),
        new DeviceBit("QBJFZSDQD",  "V1.2",  "启闭机反转",   "手动启动", 10, "手动", "停止"),
        new DeviceBit("QBJFZZDQD",  "V1.3",  "启闭机反转",   "自动启动", 11, "自动", "停止"),
        new DeviceBit("CSJLBSDQD",  "V1.4",  "除砂进料泵",   "手动启动", 12, "手动", "停止"),
        new DeviceBit("CSJLBZDQD",  "V1.5",  "除砂进料泵",   "自动启动", 13, "自动", "停止"),
        new DeviceBit("ZJPNB1SDQD", "V1.6",  "中间排泥泵1",  "手动启动", 14, "手动", "停止"),
        new DeviceBit("ZJPNB1ZDQD", "V1.7",  "中间排泥泵1",  "自动启动", 15, "自动", "停止")
    );

    /** 40002 (Modbus地址1) - VW2: V2.0 ~ V3.7 */
    public static final List<DeviceBit> REGISTER_40002 = Arrays.asList(
        new DeviceBit("ZJPNB2SDQD", "V2.0",  "中间排泥泵2",  "手动启动", 0,  "手动", "停止"),
        new DeviceBit("ZJPNB2ZDQD", "V2.1",  "中间排泥泵2",  "自动启动", 1,  "自动", "停止"),
        new DeviceBit("ZJTLQ1SDQD", "V2.2",  "中间推流器1",  "手动启动", 2,  "手动", "停止"),
        new DeviceBit("ZJTLQ1ZDQD", "V2.3",  "中间推流器1",  "自动启动", 3,  "自动", "停止"),
        new DeviceBit("ZJTLQ2SDQD", "V2.4",  "中间推流器2",  "手动启动", 4,  "手动", "停止"),
        new DeviceBit("ZJTLQ2ZDQD", "V2.5",  "中间推流器2",  "自动启动", 5,  "自动", "停止"),
        new DeviceBit("TSJLB1SDQD", "V2.6",  "脱水进料泵1",  "手动启动", 6,  "手动", "停止"),
        new DeviceBit("TSJLB1ZDQD", "V2.7",  "脱水进料泵1",  "自动启动", 7,  "自动", "停止"),
        new DeviceBit("TSJLB2SDQD", "V3.0",  "脱水进料泵2",  "手动启动", 8,  "手动", "停止"),
        new DeviceBit("TSJLB2ZDQD", "V3.1",  "脱水进料泵2",  "自动启动", 9,  "自动", "停止"),
        new DeviceBit("JYLGB1SDQD", "V3.2",  "加药螺杆泵1",  "手动启动", 10, "手动", "停止"),
        new DeviceBit("JYLGB1ZDQD", "V3.3",  "加药螺杆泵1",  "自动启动", 11, "自动", "停止"),
        new DeviceBit("JYLGB2SDQD", "V3.4",  "加药螺杆泵2",  "手动启动", 12, "手动", "停止"),
        new DeviceBit("JYLGB2ZDQD", "V3.5",  "加药螺杆泵2",  "自动启动", 13, "自动", "停止"),
        new DeviceBit("LXSSJ1SDQD", "V3.6",  "螺旋输送机1",  "手动启动", 14, "手动", "停止"),
        new DeviceBit("LXSSJ1ZDQD", "V3.7",  "螺旋输送机1",  "自动启动", 15, "自动", "停止")
    );

    /** 40003 (Modbus地址2) - VW4: V4.0 ~ V5.7 */
    public static final List<DeviceBit> REGISTER_40003 = Arrays.asList(
        new DeviceBit("LXSSJ2SDQD",  "V4.0",  "螺旋输送机2",    "手动启动", 0,  "手动", "停止"),
        new DeviceBit("LXSSJ2ZDQD",  "V4.1",  "螺旋输送机2",    "自动启动", 1,  "自动", "停止"),
        new DeviceBit("CXSBSDQD",    "V4.2",  "冲洗水泵",       "手动启动", 2,  "手动", "停止"),
        new DeviceBit("CXSBZDQD",    "V4.3",  "冲洗水泵",       "自动启动", 3,  "自动", "停止"),
        new DeviceBit("CDCPNB1SDQD", "V4.4",  "沉淀池排泥泵1",  "手动启动", 4,  "手动", "停止"),
        new DeviceBit("CDCPNB1ZDQD", "V4.5",  "沉淀池排泥泵1",  "自动启动", 5,  "自动", "停止"),
        new DeviceBit("CDCPNB2SDQD", "V4.6",  "沉淀池排泥泵2",  "手动启动", 6,  "手动", "停止"),
        new DeviceBit("CDCPNB2ZDQD", "V4.7",  "沉淀池排泥泵2",  "自动启动", 7,  "自动", "停止"),
        new DeviceBit("PACJBJSDQD",  "V5.0",  "PAC搅拌机",      "手动启动", 8,  "手动", "停止"),
        new DeviceBit("PACJBJZDQD",  "V5.1",  "PAC搅拌机",      "自动启动", 9,  "自动", "停止"),
        new DeviceBit("PACJYBSDQD",  "V5.2",  "PAC加药泵",      "手动启动", 10, "手动", "停止"),
        new DeviceBit("PACJYBZDQD",  "V5.3",  "PAC加药泵",      "自动启动", 11, "自动", "停止"),
        new DeviceBit("PAMJBJSDQD",  "V5.4",  "PAM搅拌机",      "手动启动", 12, "手动", "停止"),
        new DeviceBit("PAMJBJZDQD",  "V5.5",  "PAM搅拌机",      "自动启动", 13, "自动", "停止"),
        new DeviceBit("PAMJYBSDQD",  "V5.6",  "PAM加药泵",      "手动启动", 14, "手动", "停止"),
        new DeviceBit("PAMJYBZDQD",  "V5.7",  "PAM加药泵",      "自动启动", 15, "自动", "停止")
    );

    /** 40004 (Modbus地址3) - VW6: V6.0 ~ V6.5 (bit6~15预留) */
    public static final List<DeviceBit> REGISTER_40004 = Arrays.asList(
        new DeviceBit("QSCXBSSDQD", "V6.0",  "清水冲洗泵",  "手动启动", 0,  "手动", "停止"),
        new DeviceBit("QSCXBZDQD",  "V6.1",  "清水冲洗泵",  "自动启动", 1,  "自动", "停止"),
        new DeviceBit("BYB1SDQD",   "V6.2",  "备用泵1",     "手动启动", 2,  "手动", "停止"),
        new DeviceBit("BYB1ZDQD",   "V6.3",  "备用泵1",     "自动启动", 3,  "自动", "停止"),
        new DeviceBit("BYB2SDQD",   "V6.4",  "备用泵2",     "手动启动", 4,  "手动", "停止"),
        new DeviceBit("BYB2ZDQD",   "V6.5",  "备用泵2",     "自动启动", 5,  "自动", "停止")
    );

    /** 40006 (Modbus地址5) - VW10: V10.1, V10.2 (其余bit预留) */
    public static final List<DeviceBit> REGISTER_40006 = Arrays.asList(
        new DeviceBit("YJZD", "V10.1", "一键自动", "一键自动", 1, "一键自动", "正常"),
        new DeviceBit("YJTZ", "V10.2", "一键停止", "一键停止", 2, "一键停止", "正常")
    );

    // 寄存器地址 -> 映射表的快速查找
    public static final Map<Integer, List<DeviceBit>> REGISTER_MAP = new LinkedHashMap<>();
    static {
        REGISTER_MAP.put(40001, REGISTER_40001);
        REGISTER_MAP.put(40002, REGISTER_40002);
        REGISTER_MAP.put(40003, REGISTER_40003);
        REGISTER_MAP.put(40004, REGISTER_40004);
        REGISTER_MAP.put(40006, REGISTER_40006);
    }

    // 拼音首字母 -> DeviceBit 的全局快速查找表
    public static final Map<String, DeviceBit> CODE_INDEX = new HashMap<>();
    static {
        for (List<DeviceBit> bits : REGISTER_MAP.values()) {
            for (DeviceBit bit : bits) {
                CODE_INDEX.put(bit.getMonitorId(), bit);
            }
        }
    }

    // 监控点(拼音首字母) -> 所属寄存器地址 的快速查找表
    public static final Map<String, Integer> MONITOR_ID_REGISTER_MAP = new HashMap<>();
    static {
        REGISTER_MAP.forEach((address, bits) ->
            bits.forEach(bit -> MONITOR_ID_REGISTER_MAP.put(bit.getMonitorId(), address)));
    }

    /**
     * 判断该监控点是否为组合寄存器(REGISTER_40001~40006)中的某个 bit 位监控点
     */
    public static boolean isRegisterBitMonitorId(String monitorId) {
        return MONITOR_ID_REGISTER_MAP.containsKey(monitorId);
    }

    /**
     * 获取某 bit 位监控点所属寄存器的地址(如 40001)，非组合位返回 null
     */
    public static Integer getRegisterAddressByMonitorId(String monitorId) {
        return MONITOR_ID_REGISTER_MAP.get(monitorId);
    }

    /**
     * 判断 monitorId 是否为组合寄存器名(如 REGISTER_40001)
     */
    public static boolean isRegisterMonitorId(String monitorId) {
        if (monitorId == null || !monitorId.startsWith("REGISTER_")) {
            return false;
        }
        try {
            return REGISTER_MAP.containsKey(Integer.parseInt(monitorId.substring("REGISTER_".length())));
        } catch (NumberFormatException e) {
            return false;
        }
    }

    // ==================== 核心解析方法 ====================

    /**
     * 解析单个16位寄存器值
     * @param registerValue 从网关读取的16位无符号整数 (0~65535)
     * @param bitMapping 该寄存器对应的位映射表
     * @return 所有设备状态的列表
     */
    public static List<DeviceState> parseRegister(int registerValue, List<DeviceBit> bitMapping) {
        List<DeviceState> states = new ArrayList<>();
        for (DeviceBit bit : bitMapping) {
            boolean bitValue = ((registerValue >> bit.getBitPosition()) & 0x01) == 1;
            states.add(new DeviceState(bit, bitValue));
        }
        return states;
    }

    /**
     * 按寄存器地址解析（便捷方法）
     * @param registerValue 寄存器数值
     * @param registerAddress 40001/40002/40003/40004/40006
     * @return 设备状态列表，如果地址不存在返回空列表
     */
    public static List<DeviceState> parseByAddress(int registerValue, int registerAddress) {
        List<DeviceBit> mapping = REGISTER_MAP.get(registerAddress);
        if (mapping == null) {
            System.err.println("未知寄存器地址: " + registerAddress);
            return Collections.emptyList();
        }
        return parseRegister(registerValue, mapping);
    }

    /**
     * 只获取值为true（运行/触发）的设备
     */
    public static List<DeviceState> getActiveDevices(int registerValue, List<DeviceBit> bitMapping) {
        List<DeviceState> active = new ArrayList<>();
        for (DeviceBit bit : bitMapping) {
            boolean bitValue = ((registerValue >> bit.getBitPosition()) & 0x01) == 1;
            if (bitValue) {
                active.add(new DeviceState(bit, true));
            }
        }
        return active;
    }

    /**
     * 通过拼音首字母(code)查询设备当前状态
     * @param registerValue 寄存器原始值
     * @param monitorId 监控点 ID
     * @return 该设备是否处于ON状态，如果code不存在返回false
     */
    public static boolean getStateByCode(int registerValue, String monitorId) {
        DeviceBit bit = CODE_INDEX.get(monitorId);
        if (bit == null) {
            System.err.println("未知监控点 ID: " + monitorId);
            return false;
        }
        return ((registerValue >> bit.getBitPosition()) & 0x01) == 1;
    }

    /**
     * 通过拼音首字母(code)获取完整的DeviceState
     */
    public static Optional<DeviceState> getDeviceStateByCode(int registerValue, String monitorId) {
        DeviceBit bit = CODE_INDEX.get(monitorId);
        if (bit == null) return Optional.empty();
        boolean val = ((registerValue >> bit.getBitPosition()) & 0x01) == 1;
        return Optional.of(new DeviceState(bit, val));
    }

    /**
     * 获取指定bit位的状态（原始位运算）
     */
    public static boolean getBitState(int registerValue, int bitPosition) {
        return ((registerValue >> bitPosition) & 0x01) == 1;
    }

    /**
     * 将寄存器值转为16位二进制字符串，便于调试
     */
    public static String toBinaryString(int registerValue) {
        return String.format("%16s", Integer.toBinaryString(registerValue & 0xFFFF)).replace(' ', '0');
    }

    // ==================== 示例与测试 ====================

    public static void main(String[] args) {
        System.out.println("========== Modbus 寄存器位解析器（完整码表） ==========\n");

        // 示例1: 40001 模拟值 0x0003 = 粗格栅机手动+自动同时触发
        int reg40001 = 0x0003;
        System.out.println("【寄存器 40001】读取值: " + reg40001 + " (0x" + Integer.toHexString(reg40001).toUpperCase() + ")");
        System.out.println("二进制: " + toBinaryString(reg40001));
        System.out.println("-------------------------------------------------------");
        List<DeviceState> s1 = parseByAddress(reg40001, 40001);
        for (DeviceState s : s1) {
            System.out.println(s);
        }

        System.out.println("\n");

        // 示例2: 40003 模拟值 0x0104 = 冲洗水泵手动(bit2) + PAC搅拌机手动(bit8)
        int reg40003 = 0x0104;
        System.out.println("【寄存器 40003】读取值: " + reg40003 + " (0x" + Integer.toHexString(reg40003).toUpperCase() + ")");
        System.out.println("二进制: " + toBinaryString(reg40003));
        System.out.println("运行中的设备：");
        List<DeviceState> active3 = getActiveDevices(reg40003, REGISTER_40003);
        for (DeviceState s : active3) {
            System.out.println("  -> " + s.getBitDef().getMonitorId() + " " + s.getBitDef().getDeviceName() + 
                s.getBitDef().getAction() + " [" + s.getStatusText() + "]");
        }

        System.out.println("\n");

        // 示例3: 40004 模拟值 0x0015 = 清水手动(bit0) + 备用泵1自动(bit3) + 备用泵2手动(bit4)
        int reg40004 = 0x0015;
        System.out.println("【寄存器 40004】读取值: " + reg40004 + " (0x" + Integer.toHexString(reg40004).toUpperCase() + ")");
        System.out.println("二进制: " + toBinaryString(reg40004));
        System.out.println("-------------------------------------------------------");
        List<DeviceState> s4 = parseByAddress(reg40004, 40004);
        for (DeviceState s : s4) {
            System.out.println(s);
        }

        System.out.println("\n");

        // 示例4: 40006 特殊状态 - 一键自动触发
        int reg40006 = 0x0002; // bit1 = 1
        System.out.println("【寄存器 40006】读取值: " + reg40006 + " (0x" + Integer.toHexString(reg40006).toUpperCase() + ")");
        System.out.println("二进制: " + toBinaryString(reg40006));
        System.out.println("-------------------------------------------------------");
        List<DeviceState> s6 = parseByAddress(reg40006, 40006);
        for (DeviceState s : s6) {
            System.out.println(s);
        }

        System.out.println("\n========== 通过监控点 ID查询状态示例 ==========");
        // 使用监控点 ID直接查询，无需知道寄存器地址和bit位置
        System.out.println("查询 CDCPNB1SDQD (沉淀池排泥泵1手动启动): " +
            getDeviceStateByCode(reg40003, "CDCPNB1SDQD").map(DeviceState::getStatusText).orElse("未知"));
        System.out.println("查询 YJZD (一键自动): " +
            getDeviceStateByCode(reg40006, "YJZD").map(DeviceState::getStatusText).orElse("未知"));
        System.out.println("查询 BYB2ZDQD (备用泵2自动): " +
            getDeviceStateByCode(reg40004, "BYB2ZDQD").map(DeviceState::getStatusText).orElse("未知"));
    }
}