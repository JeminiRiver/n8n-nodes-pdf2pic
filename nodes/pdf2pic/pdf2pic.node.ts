import {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { fromBuffer } from "pdf2pic";

export class pdf2pic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF2PIC',
		name: 'pdf2pic',
		group: ['transform'],
		version: 1,
		description: 'PDF2Pic Node',
		defaults: {
			name: 'pdf2pic',
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
			},
			{
				displayName: 'PDF Name',
				name: 'pdfName',
				type: 'string',
				default: '',
				required: true,
				description: 'The name of the output PDF',
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const options = {
		  density: 100,
		  format: "png",
		  width: 600,
		  height: 600
		};

		const items = this.getInputData();

		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const outputName = this.getNodeParameter('pdfName', itemIndex, '') as string;
				const outputKey = this.getNodeParameter('outputKey', itemIndex, '') as string;
				item = items[itemIndex];

				if (item.binary === undefined) {
					throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
				}

				for (var [,key] of Object.keys(item.binary).entries()){
					const binary = Object.assign({},item.binary[key]);
					if(binary.fileType==='pdf'){
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, key);

						let convert = fromBuffer(binaryDataBuffer, options);

						convert.bulk(-1, { responseType: "base64" }).then((outputs) => {
							outputs.forEach(async (output) => {
								let base64 = output.base64 || "";
								//`${outputName}.${output.page?.toString()}.png`
								item.binary![outputKey+"_"+output.page] = await this.helpers.prepareBinaryData(Buffer.from(base64, 'base64'), `${outputName}.${output.page}.png`);
								//item.json[outputKey] = output.base64;
						  	});
						});

					}
				}

				//item.binary![outputKey] = await this.helpers.prepareBinaryData(doc, `${outputName}.png`);

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
