import { Dispatcher, Store } from 'waku-dispatcher';
import { createLightNode } from '@waku/sdk';

const contentTopic = '/rln/1/mint/json';
const store = new Store('waku-dispatcher');
let dispatcher: Dispatcher;
let dispatcherPromise: Promise<Dispatcher>;


export async function getInstance(status: (message: string) => void): Promise<Dispatcher> {
    if (!dispatcherPromise) {
        dispatcherPromise = new Promise(async (resolve) => {
            const node = await createLightNode({
                defaultBootstrap: true
            });

            // Initialize store
            
        
            // Initialize dispatcher with all required parameters
            dispatcher = new Dispatcher(node, contentTopic, false, store);
            await dispatcher.initContentTopic(contentTopic);
            dispatcher.on('mint_response', async (message) => {
                console.log("Received mint_response:", message);
                if (message.success) {
                    status("Tokens minted in transaction: " + message.hash);
                } else {
                    status("Minting failed: " + message.error);
                }

            }, false, false, undefined, false);
            await dispatcher.start();

            resolve(dispatcher);
        });
    }
    return dispatcherPromise;
}

