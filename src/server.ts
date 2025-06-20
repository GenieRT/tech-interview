import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const API_BASE = "http://000.000.0.0:7027/api"; //dirección IP de máquina con puerto

const server = new McpServer({
  name: "todoitem-server",
  version: "1.0.0",
});

interface ToDoItem {
  id: number;
  description: string;
  todoListId: number;
  isCompleted: boolean;
}

async function findItemByDescription(description: string): Promise<ToDoItem | null> {
  try {
    const response = await fetch(`${API_BASE}/todoitems`);
    if (!response.ok) return null;

    const data = await response.json();

    const items: ToDoItem[] =
  Array.isArray(data)
    ? data
    : data?.items ||
      data?.value ||
      Object.values(data).find(val => Array.isArray(val)) ||
      [];
    if (!Array.isArray(items)) return null;

    return items.find(
      i => i.description?.toLowerCase() === description.toLowerCase()
    ) || null;
  } catch (err) {
    console.error("Error al buscar ítem por descripción:", err);
    return null;
  }
}


// Crear ítem en una lista por nombre
server.tool(
  "crear_item",
  "Crear un ítem en una lista existente por nombre.",
  {
    lista: z.string(),
    descripcion: z.string(),
  },
  async ({ lista, descripcion }) => {
    // Obtener lista
    let listas: any;

    try {
      const res = await fetch(`${API_BASE}/todolists`);
      listas = await res.json();
    } catch (err) {
      return {
        content: [{ type: "text", text: "Error al obtener las listas desde la API." }],
      };
    }

    // Detectar si las listas vienen directamente o anidadas
    const listaArray =
      Array.isArray(listas)
        ? listas
        : listas?.value ||
          listas?.listas ||
          listas?.todolists ||
          Object.values(listas).find(val => Array.isArray(val)) ||
          [];

    if (!Array.isArray(listaArray) || listaArray.length === 0) {
      return {
        content: [{ type: "text", text: "La respuesta de la API no contiene listas válidas." }],
      };
    }

    const listaEncontrada = listaArray.find(
      (l: any) => l.name?.toLowerCase() === lista.toLowerCase()
    );

    if (!listaEncontrada) {
      return {
        content: [{ type: "text", text: `No se encontró la lista '${lista}'.` }],
      };
    }

    // Crear ítem
    const nuevoItem = {
      todoListId: listaEncontrada.id,
      description: descripcion
    };

    const response = await fetch(`${API_BASE}/todoitems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoItem)
    });

    if (!response.ok) {
      return {
        content: [{ type: "text", text: `Error al crear el ítem: ${await response.text()}` }],
      };
    }

    const itemCreado = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Ítem creado: "${itemCreado.description}" en la lista "${lista}".`,
        },
      ],
    };
  }
);

//Marcar ítem como completado
server.tool(
  "completar_item",
  "Marca un ítem como completado por su descripción.",
  {
    descripcion: z.string()
  },
  async ({ descripcion }) => {
    const item = await findItemByDescription(descripcion);

    if (!item) {
      return {
        content: [{ type: "text", text: `Ítem con descripción "${descripcion}" no encontrado.` }]
      };
    }

    const response = await fetch(`${API_BASE}/todoitems/${item.id}/complete`, {
      method: "PATCH"
    });

    if (!response.ok) {
      return {
        content: [{ type: "text", text: `Error al completar el ítem: ${await response.text()}` }]
      };
    }

    const completado = await response.json();
    return {
      content: [{ type: "text", text: `Ítem "${completado.description}" marcado como completado.` }]
    };
  }
);

//Actualizar item
server.tool(
  "actualizar_item",
  "Actualizar la descripción de un ítem por su descripción actual.",
  {
    descripcionActual: z.string(),
    nuevaDescripcion: z.string(),
  },
  async ({ descripcionActual, nuevaDescripcion }) => {
    const item = await findItemByDescription(descripcionActual);

    if (!item) {
      return {
        content: [{ type: "text", text: `Ítem con descripción "${descripcionActual}" no encontrado.` }]
      };
    }

    const response = await fetch(`${API_BASE}/todoitems/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: nuevaDescripcion })
    });

    if (!response.ok) {
      return {
        content: [{ type: "text", text: `Error al actualizar el ítem: ${await response.text()}` }]
      };
    }

    const actualizado = await response.json();
    return {
      content: [{ type: "text", text: `Ítem actualizado: "${actualizado.description}".` }]
    };
  }
);


//Eliminar item
server.tool(
  "eliminar_item",
  "Eliminar un ítem por su descripción.",
  {
    descripcion: z.string(),
  },
  async ({ descripcion }) => {
    const item = await findItemByDescription(descripcion);

    if (!item) {
      return {
        content: [{ type: "text", text: `Ítem con descripción "${descripcion}" no encontrado.` }]
      };
    }

    const response = await fetch(`${API_BASE}/todoitems/${item.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return {
        content: [{ type: "text", text: `Error al eliminar el ítem: ${await response.text()}` }]
      };
    }

    return {
      content: [{ type: "text", text: `Ítem "${item.description}" eliminado correctamente.` }]
    };
  }
);

export {server}