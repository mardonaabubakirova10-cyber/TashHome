import { useState } from 'react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import { Input, Select, Textarea } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'

// Временная страница для проверки UI-kit; удалим перед сдачей.
export default function UiDemo() {
  const [open, setOpen] = useState(false)
  const toast = useToast()

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">UI-kit</h1>

      <Card className="grid gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">Ниже рынка</Badge>
          <Badge tone="warning">По рынку</Badge>
          <Badge tone="danger">Выше рынка</Badge>
        </div>
      </Card>

      <Card className="grid gap-3 p-5 sm:grid-cols-2">
        <Input label="Имя" placeholder="Алишер" />
        <Input label="Телефон" placeholder="+998" error="Неверный формат телефона" />
        <Select label="Район" defaultValue="">
          <option value="" disabled>Выберите район</option>
          <option>Юнусабад</option>
          <option>Чиланзар</option>
        </Select>
        <Textarea label="Сообщение" placeholder="Комментарий" />
      </Card>

      <Card className="flex flex-wrap gap-2 p-5">
        <Button onClick={() => setOpen(true)}>Открыть окно</Button>
        <Button variant="secondary" onClick={() => toast('Заявка отправлена', 'success')}>Toast: успех</Button>
        <Button variant="secondary" onClick={() => toast('Что-то пошло не так', 'error')}>Toast: ошибка</Button>
      </Card>

      <Card className="grid gap-2 p-5">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Запись на просмотр">
        <p className="text-sm text-slate-600">Содержимое модального окна.</p>
      </Modal>
    </div>
  )
}
