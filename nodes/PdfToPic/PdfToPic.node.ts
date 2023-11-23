/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { PngPageOutput, pdfToPng } from 'pdf-to-png-converter';

export class PdfToPic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF-2-PIC',
		name: 'pdf2pic',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: "file:icon.png",
		group: ['transform'],
		version: 1,
		description: 'PDF2Pic Node',
		defaults: {
			name: 'PDF-2-Pic',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'toPDFImages',
				required: true,
				options:[
					{
						name:'Covert PDF To Images',
						value:'toPDFImages'
					}
				],
			},
			{
				displayName: 'Destination Key',
				name: 'outputKey',
				type: 'string',
				default: 'data',
				required: true,
				description: 'The name the binary key to copy data to',
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let item: INodeExecutionData;
		if( items.length <= 0 ) {
			throw new NodeOperationError(this.getNode(), 'No items where sent!');
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {

			try {
				const outputKey = this.getNodeParameter('outputKey', itemIndex, '') as string;
				item = items[itemIndex];

				item.json['Status'] = 'Have Items';

				if (item.binary === undefined) {
					throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
				}

				for (var [,key] of Object.keys(item.binary).entries()){

					item.json['Status'] = 'Have Binaries';

					const binary = Object.assign({},item.binary[key]);
					if(binary.fileType==='pdf'){

						item.json['Status'] = 'Have PDF';

						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, key);

						//let convert = fromBuffer(binaryDataBuffer, options);

						const pngPages: PngPageOutput[] = await pdfToPng(binaryDataBuffer, {
							viewportScale: 2.0,
						});

						pngPages.forEach(async (pngPage: PngPageOutput, index: number) => {
							item.json['Status'] = 'Have Pages';

							Buffer.from("Hello World").toString('base64')
							item.json[outputKey+"."+pngPage.pageNumber] = Buffer.from(pngPage.content).toString('base64');
							item.binary![key+"."+pngPage.pageNumber] = await this.helpers.prepareBinaryData(pngPage.content);

						});

						delete item.binary[key];
					} else {
						throw new NodeOperationError(this.getNode(), 'No pdf exists on item!');
					}
				}

			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}

		}

		return this.prepareOutputData(items);
	}
}
