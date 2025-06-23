import { base64Logo } from './base64-logo';

export function generateTransactionHtml(
	transaction: Transaction,
	settings: WorkstatSettings
): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>Transaction Receipt</title>
			<style>
				@page {
					size: A5;
					margin: 0;
				}
				body {
					font-family: Arial, sans-serif;
					margin: 20px;
					padding: 0;
					text-align: center;
					font-size: 12px;
				}
				.receipt {
					width: 100%;
					max-width: 400px;
					margin: 0 auto;
				}
				.header, .footer {
					margin-bottom: 10px;
				}
				.logo img {
					width: auto;
					height: 6rem;
				}
				.details, .items, .summary {
					width: 100%;
					text-align: left;
					margin-top: 10px;
				}
				.details td, .summary td {
					padding: 2px 0;
				}
				.items th, .items td {
					padding: 4px 0;
					border-bottom: 1px dashed #999;
				}
				.items {
					margin-top: 15px;
					border-top: 1px dashed #999;
					border-bottom: 1px dashed #999;
				}
				.total {
					font-weight: bold;
				}
				hr {
					margin: 10px 0;
					border: none;
					border-top: 1px dashed #999;
				}
			</style>
		</head>
		<body>
			<div class="receipt">
				<div class="header">
					<div class="logo">
						<img src="${base64Logo()}" alt="Company Logo">
					</div>
					 <div className="text-2xl text-gray-600 font-medium">
						${settings.store}
					</div>
					<div className="text-gray-500">
						${settings.addressLine1}
					</div>
					<div className="text-gray-500">
						${settings.addressLine2}
					</div>
					<div className="text-gray-500">
						Tel: ${settings.contact}
					</div>

				</div>

				<hr>

				<table class="details">
					<tr>
						<td>Ref No:</td><td>${transaction?.refNumber || '-'}</td>
					</tr>
					<tr>
						<td>Customer:</td><td>${transaction?.customer?.name || 'Walk in customer'}</td>
					</tr>
					<tr>
						<td>Cashier:</td><td>${transaction?.user?.fullname || 'Administrator'}</td>
					</tr>
					<tr>
						<td>Date:</td><td>${transaction.date || new Date().toLocaleDateString()}</td>
					</tr>
					<tr>
						<td>Till:</td><td>${transaction?.workstation?.tillName || 'till 1'}</td>
					</tr>
				</table>

				<hr>

				<table class="items">
					<thead>
						<tr>
							<th>Item</th>
							<th>Qty</th>
							<th>Price</th>
						</tr>
					</thead>
					<tbody>
						${(transaction.items || [])
			.map(
				(item: CartItem) => `
							<tr>
								<td>${item.name}</td>
								<td>${item.quantity}</td>
								<td>MK${(item.sellPrice * item.quantity).toFixed(2)}</td>
							</tr>
						`
			)
			.join('')}
					</tbody>
				</table>

				<hr>

				<table class="summary">
					<tr>
						<td>Subtotal:</td>
						<td style="text-align: right;">MK${transaction.subtotal.toFixed(2)}</td>
					</tr>
					<tr>
						<td>Discount:</td>
						<td style="text-align: right;">MK${transaction.discount.toFixed(2)}</td>
					</tr>
					<tr>
						<td>Tax:</td>
						<td style="text-align: right;">MK${transaction.tax.toFixed(2)}</td>
					</tr>
					<tr class="total">
						<td>Total:</td>
						<td style="text-align: right;">MK${transaction.total.toFixed(2)}</td>
					</tr>
					<tr>
						<td>Paid:</td>
						<td style="text-align: right;">MK${transaction.paid.toFixed(2)}</td>
					</tr>
					<tr>
						<td>Change:</td>
						<td style="text-align: right;">MK${transaction.changeAmount.toFixed(2)}</td>
					</tr>
					<tr>
						<td>Method:</td>
						<td style="text-align: right;">${transaction.paymentMethod?.name || 'Cash'}</td>
					</tr>
				</table>

				<hr>

				<div class="footer">
					Thank you for shopping with us!
				</div>
			</div>
		</body>
		</html>
	`;
}
