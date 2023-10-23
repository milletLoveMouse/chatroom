import React, { forwardRef, memo, Ref, useContext, useImperativeHandle, useMemo, useRef, useState } from 'react';
import RTCClient from '@/utils/WebRTC/rtc-client';
import { Context } from '@/pages/chatroom'
import getFileTypeImage from '/@/utils/file-type-image';
import { sliceFileAndBlobToBase64 } from '/@/utils/fileUtils';
import { formatDate } from '/@/utils/formatDate';
import style from './Chat.module.less';
import MessageList from '@/components/chat/MessageList';
import { Icon } from '@ricons/utils';
import { ImageOutline } from '@ricons/ionicons5';
import { DriveFileMoveRound } from '@ricons/material';
import usefileSelect, { AcceptType, UploadConfig } from '/@/hooks/useFileSelect';
import FileList, { Img } from '@/components/FileList';
import { Button } from 'antd';

type Props = {
  open: boolean;
}

export type RefType = {
  clearMessage: () => void;
}

export type MessageItem = {
  id: string;
  isSelf: boolean;
  username: string;
  HHmmss: string;
  type: 'file' | 'text';
  text?: string;
  fileInfo?: FileInfo;
}
type FileInfo = Awaited<ReturnType<typeof getFileInfo>>

const Chat = memo(forwardRef((props: Props, ref: Ref<RefType>) => {  
  const rtc = useContext<RTCClient>(Context)
  rtc.off('message')
  rtc.on('message', async (message: MessageItem) =>{
    message.isSelf = false
    messageList.push(message)
    setMessageList([...messageList])
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [messageList, setMessageList] = useState<MessageItem[]>([])

  const selectImageConfig = {
    multiple: true,
    accept: ["image/*"] as AcceptType[],
    callback: uploadFile,
    max: 1024 * 1024 * 10,
  }

  const selectFileConfig = {
    multiple: true,
    accept: ["*/*"] as AcceptType[],
    callback: uploadFile,
    max: 1024 * 1024 * 1024,
  }

  const fileSelect = (selectConfig: UploadConfig) => {
    usefileSelect(selectConfig)
  }

  const maxlength = 100
  const [fileMessageList, setFileMessageList] = useState<Img[]>([])

  function remove(_, index: number) {
    fileMessageList.splice(index, 1);
    setFileMessageList([...fileMessageList])
  }

  function updateImage(img: Img, index: number) {
    fileMessageList[index].file = img.file
    setFileMessageList([...fileMessageList])
  }

  const [loading, setLoading] = useState(false)
  async function sendMessage(e: React.SyntheticEvent) {
    if (e.type === 'keyup' && (e as React.KeyboardEvent).code !== 'Enter') return
    if (inputValue.length > maxlength || loading) return
    setLoading(true)
    sendTextMessage()
    await sendFileMessage()
    setLoading(false)
  }

  function sendTextMessage() {
    if (!inputValue.trim().length) return
    const { username } = rtc.userInfo
    const date = new Date
    const { HHmmss } = formatDate(date)
    const messageItem: MessageItem = {
      username,
      type: 'text',
      id: crypto.randomUUID(),
      isSelf: true,
      HHmmss,
      text: inputValue
    }
    rtc.channelSendMesage(messageItem)
    messageList.push(messageItem)
    setInputValue('')
    setMessageList([...messageList])
    inputRef.current.value = ''
    console.log('messageList', messageList);
  }

  async function sendFileMessage() {
    while(fileMessageList.length) {
      const fileItem = fileMessageList.shift()
      const { username } = rtc.userInfo
      const date = new Date
      const { HHmmss } = formatDate(date)
      const messageItem: MessageItem = {
        id: crypto.randomUUID(),
        isSelf: true,
        username,
        HHmmss,
        type: 'file',
        fileInfo: await getFileInfo(fileItem.file)
      }
      rtc.channelSendMesage(messageItem)
      messageList.push(messageItem)
      delete messageItem.fileInfo.chunks
    }
    setFileMessageList([])
    setMessageList([...messageList])
  }

  async function uploadFile(files: File[], err: Error, inputFiles: File[]) {
    err && console.error(err);
    setFileMessageList([...fileMessageList, ...files.map(file => {
      return {
        file,
        url: getFileTypeImage(file.name)
      }
    })])
  }

  function clearMessage() {
    setMessageList([])
    setFileMessageList([])
  }

  useImperativeHandle(ref, () => ({
    clearMessage
  }))
  return (
    <div className={style.rtcChat + ' ' + (props.open ? style.open : '')}>
      <MessageList messageList={messageList} />
      <div className="send-tool">
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><ImageOutline onClick={() => fileSelect(selectImageConfig)} /></Icon></span>
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><DriveFileMoveRound onClick={() => fileSelect(selectFileConfig)} /></Icon></span>
      </div>
      <FileList fileList={fileMessageList} remove={remove} updateImage={updateImage}/>
      <div className="send">
        <input
          ref={inputRef}
          className="chat-input"
          onInput={(e) => setInputValue((e.nativeEvent.target as HTMLInputElement).value)}
          onKeyUp={sendMessage}
          placeholder="请输入消息内容"
          maxLength={maxlength}
          disabled={loading}
        />
        <Button type="primary" size="large" loading={loading} onClick={sendMessage}>发送</Button>
      </div>
    </div>
  )
}))

async function getFileInfo(file: File) {
  const { name, size, type } = file
  const kb = 1024
  const mb = 1024 * kb
  const gb = 1024 * mb
  const formatSize = size < (gb / 2)
    ? size < mb
      ? (size / kb).toFixed(2) + 'KB' 
      : (size / mb).toFixed(2) + 'MB'
    : (size / gb).toFixed(2) + 'GB';
  let url = getFileTypeImage(name)
  let chunks = await sliceFileAndBlobToBase64(file, 180 * 1024)
  return {
    name,
    size: formatSize,
    type,
    file,
    FQ: chunks.length,
    chunks,
    url
  }
}

export default Chat;