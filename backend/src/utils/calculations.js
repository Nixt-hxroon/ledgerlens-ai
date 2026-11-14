/**
 * Deterministic Financial and Arithmetic Calculation Engine
 * Rule: Subtotal + Tax - Discount = Total Amount (within rounding tolerance)
 */

export const ROUNDING_TOLERANCE = 0.05;

export const parseNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const roundCurrency = (val) => {
  return Math.round((parseNumber(val) + Number.EPSILON) * 100) / 100;
};

export const validateInvoiceMath = ({ subtotal, taxAmount, discount = 0, totalAmount }) => {
  const sub = parseNumber(subtotal);
  const tax = parseNumber(taxAmount);
  const disc = parseNumber(discount);
  const total = parseNumber(totalAmount);

  const calculatedTotal = roundCurrency(sub + tax - disc);
  const difference = roundCurrency(Math.abs(calculatedTotal - total));

  const isValid = difference <= ROUNDING_TOLERANCE;

  return {
    isValid,
    calculatedTotal,
    statedTotal: total,
    difference,
    tolerance: ROUNDING_TOLERANCE,
  };
};

export const validateLineItems = (lineItems = [], statedSubtotal = null) => {
  let calculatedSubtotal = 0;
  let calculatedTax = 0;
  const issues = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const qty = parseNumber(item.quantity) || 1;
    const unitPrice = parseNumber(item.unit_price) || 0;
    const itemTotal = parseNumber(item.total_amount) || 0;
    const itemTax = parseNumber(item.tax_amount) || 0;

    const expectedItemTotal = roundCurrency(qty * unitPrice);
    if (Math.abs(expectedItemTotal - itemTotal) > ROUNDING_TOLERANCE && itemTotal > 0) {
      issues.push({
        index: i,
        description: item.description || `Item #${i + 1}`,
        expected: expectedItemTotal,
        stated: itemTotal,
        reason: `Quantity (${qty}) * Unit Price (${unitPrice}) = ${expectedItemTotal}, but line total is ${itemTotal}`,
      });
    }

    calculatedSubtotal += itemTotal > 0 ? itemTotal : expectedItemTotal;
    calculatedTax += itemTax;
  }

  calculatedSubtotal = roundCurrency(calculatedSubtotal);
  calculatedTax = roundCurrency(calculatedTax);

  let subtotalMatch = true;
  if (statedSubtotal !== null && statedSubtotal !== undefined) {
    const parsedStatedSub = parseNumber(statedSubtotal);
    if (parsedStatedSub > 0 && Math.abs(calculatedSubtotal - parsedStatedSub) > ROUNDING_TOLERANCE) {
      subtotalMatch = false;
    }
  }

  return {
    lineItemCount: lineItems.length,
    calculatedSubtotal,
    calculatedTax,
    subtotalMatch,
    issues,
  };
};

export const validateDateChronology = (docDateStr, dueDateStr) => {
  if (!docDateStr || !dueDateStr) {
    return { valid: true }; // Missing dates are handled by mandatory field checks
  }

  const docDate = new Date(docDateStr);
  const dueDate = new Date(dueDateStr);

  if (isNaN(docDate.getTime()) || isNaN(dueDate.getTime())) {
    return {
      valid: false,
      reason: 'Invalid date format encountered in document or due date',
    };
  }

  if (dueDate < docDate) {
    return {
      valid: false,
      reason: `Due date (${dueDateStr}) precedes document date (${docDateStr})`,
    };
  }

  return { valid: true };
};

