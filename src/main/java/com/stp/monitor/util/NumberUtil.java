package com.stp.monitor.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 数值格式化工具
 */
public class NumberUtil {

    private NumberUtil() {
    }

    /**
     * 将数值字符串按四舍五入保留 scale 位小数，并去除末尾无意义的 0
     * 非数字或空值原样返回
     */
    public static String round(String value, int scale) {
        if (value == null || value.trim().isEmpty()) {
            return value;
        }
        try {
            BigDecimal bd = new BigDecimal(value.trim());
            return bd.setScale(scale, RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();
        } catch (NumberFormatException e) {
            return value;
        }
    }
}
